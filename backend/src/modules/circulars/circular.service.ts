import { CircularTemplateStatus, CircularTemplateType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';
import { buildPrismaQuery, paginate } from '../../shared/utils/pagination';
import { notifyManyUsers } from '../notifications/notification.service';
import type {
  CreateTemplateInput,
  GenerateCircularInput,
  QueryTemplatesInput,
  UpdateTemplateInput,
} from './circular.schema';

export async function getTemplates(tenantId: string, filters: QueryTemplatesInput) {
  const { page, limit, status, type, sort_by, sort_order } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (status) where.status = status;
  if (type) where.type = type;

  const [templates, total] = await Promise.all([
    prisma.circularTemplate.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: { [sort_by || 'created_at']: sort_order || 'desc' },
      include: {
        created_by_user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.circularTemplate.count({ where }),
  ]);

  return { data: templates, pagination: paginate(page, limit, total) };
}

export async function getTemplateById(templateId: string, tenantId: string) {
  const template = await prisma.circularTemplate.findFirst({
    where: {
      id: templateId,
      tenant_id: tenantId,
    },
    include: {
      created_by_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!template) throw new NotFoundError('Circular Template');
  return template;
}

export async function createTemplate(tenantId: string, data: CreateTemplateInput, userId: string) {
  return prisma.circularTemplate.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      type: data.type as CircularTemplateType,
      sections: data.sections,
      created_by: userId,
    },
    include: {
      created_by_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function updateTemplate(templateId: string, data: UpdateTemplateInput, tenantId: string) {
  const existing = await prisma.circularTemplate.findFirst({
    where: {
      id: templateId,
      tenant_id: tenantId,
    },
  });

  if (!existing) throw new NotFoundError('Circular Template');

  return prisma.circularTemplate.update({
    where: { id: templateId },
    data: {
      ...data,
      type: data.type as CircularTemplateType | undefined,
      status: data.status as CircularTemplateStatus | undefined,
    },
    include: {
      created_by_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function generateCircular(tenantId: string, data: GenerateCircularInput, userId: string) {
  const [template, company] = await Promise.all([
    data.template_id
      ? prisma.circularTemplate.findFirst({
          where: {
            id: data.template_id,
            tenant_id: tenantId,
          },
        })
      : Promise.resolve(null),
    prisma.company.findFirst({
      where: {
        id: data.company_id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (data.template_id && !template) throw new NotFoundError('Circular Template');
  if (!company) throw new NotFoundError('Company');

  const generatedCircularCreate = prisma.generatedCircular.create({
    data: {
      tenant_id: tenantId,
      template_id: data.template_id ?? null,
      company_id: data.company_id,
      company_name: data.company_name,
      role_name: data.role_name,
      type: data.type,
      field_values: data.field_values,
      generated_by: userId,
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          version: true,
          sections: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      generated_by_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  let circular;
  if (template) {
    const [created] = await prisma.$transaction([
      generatedCircularCreate,
      prisma.circularTemplate.update({
        where: { id: template.id },
        data: { used_count: { increment: 1 } },
      }),
    ]);
    circular = created;
  } else {
    circular = await generatedCircularCreate;
  }

  try {
    const students = await prisma.user.findMany({
      where: { tenant_id: tenantId, role: 'student', is_active: true },
      select: { id: true },
    });
    if (students.length > 0) {
      void notifyManyUsers({
        tenantId,
        type: 'circular',
        title: `New circular: ${data.role_name} at ${data.company_name}`,
        description: `Type: ${data.type}`,
        priority: 'medium',
        actionUrl: '/circulars',
        payload: { circular_id: circular.id, company_id: data.company_id },
        userIds: students.map((u) => u.id),
      });
    }
  } catch (err) {
    // swallow
  }

  return circular;
}

export async function getGeneratedCirculars(tenantId: string) {
  return prisma.generatedCircular.findMany({
    where: { tenant_id: tenantId },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          version: true,
          sections: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      generated_by_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { generated_at: 'desc' },
  });
}
