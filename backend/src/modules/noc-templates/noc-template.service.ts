import { MasterCategory, User } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';
import type { UpsertNocTemplateInput } from './noc-template.schema';

type TemplateActor = Pick<User, 'id' | 'name'>;

const ensuredTenantTemplates = new Set<string>();
const pendingTenantTemplates = new Map<string, Promise<void>>();

function cleanValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function titleCase(value: string) {
  return cleanValue(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatNocPostingTypeLabel(value: string) {
  return titleCase(value);
}

function normalizeValue(value: string) {
  return cleanValue(value).toLowerCase();
}

function buildTemplateInclude() {
  return {
    posting_type_master: {
      select: {
        id: true,
        value: true,
        category: true,
        is_active: true,
      },
    },
    created_by_user: {
      select: {
        id: true,
        name: true,
      },
    },
    updated_by_user: {
      select: {
        id: true,
        name: true,
      },
    },
  } as const;
}

function normalizeScopeValue(value: string) {
  return cleanValue(value).toLowerCase();
}

function normalizeBranchScope(value?: string | null) {
  const cleaned = value ? cleanValue(value) : '';
  return cleaned ? cleaned : 'ALL';
}

export function buildDefaultNocTemplateBodyHtml(programLabel: string) {
  return [
    '<p>Dear Sir/Ma\'am,</p>',
    `<p><strong>${programLabel}</strong> is approved through the Training and Placement workflow. We recommend the below student to undergo the applied engagement at your esteemed organization.</p>`,
    '<p>We request you to kindly support the student during the duration mentioned in this letter and extend the necessary cooperation throughout the approved period.</p>',
  ].join('');
}

async function writeTemplateAuditLog(args: {
  tenantId: string;
  actor: TemplateActor;
  action: string;
  targetId?: string;
  details: string;
}) {
  await prisma.auditLog.create({
    data: {
      tenant_id: args.tenantId,
      user_id: args.actor.id,
      user_name: args.actor.name ?? undefined,
      action: args.action,
      module: 'noc_templates',
      target_type: 'noc_template',
      target_id: args.targetId,
      details: args.details,
    },
  }).catch(() => undefined);
}

export async function ensureTenantNocTemplatesSeeded(tenantId: string) {
  if (ensuredTenantTemplates.has(tenantId)) {
    return;
  }

  const pending = pendingTenantTemplates.get(tenantId);
  if (pending) {
    await pending;
    return;
  }

  const seedPromise = (async () => {
    const [postingTypes, existingTemplates] = await Promise.all([
      prisma.masterOption.findMany({
        where: {
          tenant_id: tenantId,
          category: 'posting_type',
          is_active: true,
        },
        select: {
          id: true,
          value: true,
        },
      }),
      prisma.nocTemplate.findMany({
        where: { tenant_id: tenantId },
        select: { posting_type_master_id: true },
      }),
    ]);

    const existingIds = new Set(existingTemplates.map((template) => template.posting_type_master_id));
    const seedRecords = postingTypes
      .filter((postingType) => !existingIds.has(postingType.id))
      .map((postingType) => ({
        tenant_id: tenantId,
        posting_type_master_id: postingType.id,
        branch_scope: 'ALL',
        name: `NOC Template - ${titleCase(postingType.value)}`,
        subject: `${titleCase(postingType.value)} Program`,
        body_html: buildDefaultNocTemplateBodyHtml(titleCase(postingType.value)),
      }));

    if (seedRecords.length > 0) {
      await prisma.nocTemplate.createMany({
        data: seedRecords,
        skipDuplicates: true,
      });
    }

    ensuredTenantTemplates.add(tenantId);
  })().finally(() => {
    pendingTenantTemplates.delete(tenantId);
  });

  pendingTenantTemplates.set(tenantId, seedPromise);
  await seedPromise;
}

export async function getNocTemplates(tenantId: string) {
  await ensureTenantNocTemplatesSeeded(tenantId);

  return prisma.nocTemplate.findMany({
    where: { tenant_id: tenantId },
    include: buildTemplateInclude(),
    orderBy: { updated_at: 'desc' },
  });
}

export async function getNocTemplateByPostingTypeId(tenantId: string, postingTypeMasterId: string) {
  await ensureTenantNocTemplatesSeeded(tenantId);

  const templates = await prisma.nocTemplate.findMany({
    where: {
      tenant_id: tenantId,
      posting_type_master_id: postingTypeMasterId,
    },
    include: buildTemplateInclude(),
  });

  return (
    templates.find((template) => normalizeScopeValue(template.branch_scope) === 'all')
    ?? templates[0]
    ?? null
  );
}

export async function upsertNocTemplate(
  tenantId: string,
  actor: TemplateActor,
  postingTypeMasterId: string,
  data: UpsertNocTemplateInput
) {
  const postingType = await prisma.masterOption.findFirst({
    where: {
      id: postingTypeMasterId,
      tenant_id: tenantId,
      category: 'posting_type',
    },
    select: {
      id: true,
      value: true,
    },
  });

  if (!postingType) {
    throw new NotFoundError('Posting type master');
  }

  const existing = await prisma.nocTemplate.findFirst({
    where: {
      tenant_id: tenantId,
      posting_type_master_id: postingTypeMasterId,
      branch_scope: normalizeBranchScope(data.branch_scope ?? null),
    },
  });

  const branchScope = normalizeBranchScope(data.branch_scope ?? null);
  const templateData = {
    tenant_id: tenantId,
    posting_type_master_id: postingTypeMasterId,
    branch_scope: branchScope,
    name: cleanValue(data.name),
    subject: cleanValue(data.subject),
    body_html: data.body_html.trim(),
    updated_by: actor.id,
  };

  const template = existing
    ? await prisma.nocTemplate.update({
        where: { id: existing.id },
        data: templateData,
        include: buildTemplateInclude(),
      })
    : await prisma.nocTemplate.create({
        data: {
          ...templateData,
          created_by: actor.id,
        },
        include: buildTemplateInclude(),
      });

  await writeTemplateAuditLog({
    tenantId,
    actor,
    action: existing ? 'update_noc_template' : 'create_noc_template',
    targetId: template.id,
    details: `${existing ? 'Updated' : 'Created'} NOC template for ${postingType.value} (${branchScope})`,
  });

  return template;
}

export async function getTemplateForProgram(tenantId: string, program: string, branch?: string | null) {
  await ensureTenantNocTemplatesSeeded(tenantId);

  const postingType = await prisma.masterOption.findFirst({
    where: {
      tenant_id: tenantId,
      category: 'posting_type',
      normalized_value: normalizeValue(program),
    },
    select: {
      id: true,
      value: true,
    },
  });

  if (!postingType) {
    return null;
  }

  const templates = await prisma.nocTemplate.findMany({
    where: {
      tenant_id: tenantId,
      posting_type_master_id: postingType.id,
    },
    include: buildTemplateInclude(),
  });

  const normalizedBranch = branch ? normalizeScopeValue(branch) : '';
  const template = templates.find((item) => normalizeScopeValue(item.branch_scope) === normalizedBranch)
    ?? templates.find((item) => normalizeScopeValue(item.branch_scope) === 'all')
    ?? templates[0]
    ?? null;

  return {
    postingType,
    template,
  };
}
