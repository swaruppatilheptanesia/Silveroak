import { prisma } from '../../config/database';

export async function getDashboardStats(tenantId: string) {
  const [
    totalStudents,
    totalCompanies,
    totalPostings,
    activePostings,
    totalApplications,
    totalOffers,
    acceptedOffers,
    totalEvents,
  ] = await Promise.all([
    prisma.student.count({ where: { tenant_id: tenantId } }),
    prisma.company.count({ where: { tenant_id: tenantId } }),
    prisma.posting.count({ where: { tenant_id: tenantId } }),
    prisma.posting.count({ where: { tenant_id: tenantId, status: 'published' } }),
    prisma.application.count({ where: { tenant_id: tenantId } }),
    prisma.offer.count({ where: { tenant_id: tenantId } }),
    prisma.offer.count({ where: { tenant_id: tenantId, status: 'accepted' } }),
    prisma.event.count({ where: { tenant_id: tenantId } }),
  ]);

  return {
    students: { total: totalStudents },
    companies: { total: totalCompanies },
    postings: { total: totalPostings, active: activePostings },
    applications: { total: totalApplications },
    offers: { total: totalOffers, accepted: acceptedOffers },
    events: { total: totalEvents },
  };
}

export async function getPlacementStats(tenantId: string) {
  const [placed, unplaced, offersByType] = await Promise.all([
    prisma.student.count({
      where: {
        tenant_id: tenantId,
        offers: { some: { status: 'accepted' } },
      },
    }),
    prisma.student.count({
      where: {
        tenant_id: tenantId,
        offers: { none: { status: 'accepted' } },
      },
    }),
    prisma.offer.groupBy({
      by: ['type'],
      where: { tenant_id: tenantId, status: 'accepted' },
      _count: true,
    }),
  ]);

  return { placed, unplaced, offers_by_type: offersByType };
}

export async function getApplicationPipeline(tenantId: string) {
  const pipeline = await prisma.application.groupBy({
    by: ['current_stage'],
    where: { tenant_id: tenantId },
    _count: true,
  });

  return { pipeline: pipeline.map(p => ({ stage: p.current_stage, count: p._count })) };
}

export async function getCompanyWiseStats(tenantId: string) {
  const companies = await prisma.company.findMany({
    where: { tenant_id: tenantId },
    select: {
      id: true,
      name: true,
      classification: true,
      _count: { select: { postings: true, offers: true, engagements: true } },
    },
    orderBy: { name: 'asc' },
  });

  return { companies };
}

export async function getDepartmentWiseStats(tenantId: string) {
  const departments = await prisma.student.groupBy({
    by: ['department'],
    where: { tenant_id: tenantId },
    _count: true,
  });

  return { departments: departments.map(d => ({ department: d.department, count: d._count })) };
}

export async function getProfileCompletionStats(tenantId: string) {
  const ranges = [
    { label: '0-25%', min: 0, max: 25 },
    { label: '26-50%', min: 26, max: 50 },
    { label: '51-75%', min: 51, max: 75 },
    { label: '76-100%', min: 76, max: 100 },
  ];

  const stats = await Promise.all(
    ranges.map(async (r) => ({
      range: r.label,
      count: await prisma.student.count({
        where: {
          tenant_id: tenantId,
          profile_completion_percentage: { gte: r.min, lte: r.max },
        },
      }),
    }))
  );

  return { profile_completion: stats };
}

export * from './report.analytics.service';
