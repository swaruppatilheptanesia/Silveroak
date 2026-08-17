import { prisma } from '../../config/database';
import { AuthorizationError, NotFoundError } from '../../shared/errors';
import { Prisma } from '@prisma/client';
import { resolveFacultyScope, studentMatchesFacultyScope } from '../../shared/utils/faculty-scope';
import type {
  CreatePortfolioProjectInput,
  UpdatePortfolioProjectInput,
  CreateShowcaseInput,
  UpdatePortfolioStatusInput,
} from './portfolio.schema';
import { PortfolioStatus } from '@prisma/client';

async function getStudentAndPortfolio(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  let portfolio = await prisma.portfolio.findUnique({ where: { student_id: student.id } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: {
        student_id: student.id,
        status: 'published',
      },
    });
  }

  return { student, portfolio };
}

async function getStudentPortfolioProjects(studentId: string) {
  return prisma.studentProject.findMany({
    where: { student_id: studentId },
    orderBy: [
      { display_order: 'asc' },
      { created_at: 'desc' },
    ] as Prisma.StudentProjectOrderByWithRelationInput[],
  });
}

async function getPortfolioShowcases(portfolioId: string) {
  return prisma.internshipShowcase.findMany({
    where: { portfolio_id: portfolioId },
    orderBy: { created_at: 'desc' },
  });
}

export async function getMyPortfolio(userId: string) {
  const { student, portfolio } = await getStudentAndPortfolio(userId);
  const [projects, showcases] = await Promise.all([
    getStudentPortfolioProjects(student.id),
    getPortfolioShowcases(portfolio.id),
  ]);

  return {
    ...portfolio,
    projects,
    showcases,
  };
}

export async function getStudentPortfolio(
  studentId: string,
  user: Express.AuthUser,
) {
  if (
    user.role !== 'tpo_admin'
    && user.role !== 'tpo_employee'
    && user.role !== 'super_admin'
    && user.role !== 'faculty_coordinator'
  ) {
    throw new AuthorizationError(
      `Role '${user.role}' is not allowed to access this resource`,
      'ROLE_NOT_ALLOWED',
    );
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenant_id: user.tenant_id },
    select: {
      id: true,
      full_name: true,
      enrollment_number: true,
      department: true,
      batch: true,
      // course + institute drive the faculty scope check below (not returned in the payload).
      course: true,
      institute: true,
    },
  });

  if (!student) {
    throw new NotFoundError('Student');
  }

  // A faculty coordinator may only open students within their assignment. Use the SAME tolerant
  // matcher as the Directory / NOC / My Programs — an exact department equality almost never matches
  // (Student.department is course-derived, faculty.department is free-typed / a branch name).
  if (user.role === 'faculty_coordinator') {
    if (!studentMatchesFacultyScope(student, resolveFacultyScope(user))) {
      throw new NotFoundError('Student');
    }
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { student_id: student.id },
  });

  const [projects, showcases] = await Promise.all([
    getStudentPortfolioProjects(student.id),
    portfolio ? getPortfolioShowcases(portfolio.id) : Promise.resolve([]),
  ]);

  return {
    status: portfolio?.status ?? 'missing',
    student: {
      id: student.id,
      full_name: student.full_name,
      enrollment_number: student.enrollment_number,
      department: student.department,
      batch: student.batch,
    },
    portfolio: portfolio
      ? {
          ...portfolio,
          projects,
          showcases,
        }
      : null,
  };
}

export async function updatePortfolioStatus(userId: string, data: UpdatePortfolioStatusInput) {
  const { portfolio } = await getStudentAndPortfolio(userId);
  return prisma.portfolio.update({
    where: { id: portfolio.id },
    data: { status: data.status as PortfolioStatus },
  });
}

export async function addProject(userId: string, data: CreatePortfolioProjectInput) {
  const { student, portfolio } = await getStudentAndPortfolio(userId);
  const project = await prisma.studentProject.create({
    data: {
      student_id: student.id,
      portfolio_id: portfolio.id,
      ...data,
    } as Prisma.StudentProjectUncheckedCreateInput,
  });
  await updateCounts(portfolio.id, student.id);
  return project;
}

export async function updateProject(userId: string, projectId: string, data: UpdatePortfolioProjectInput) {
  const { student, portfolio } = await getStudentAndPortfolio(userId);
  const existing = await prisma.studentProject.findFirst({
    where: { id: projectId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Portfolio Project');

  const project = await prisma.studentProject.update({
    where: { id: projectId },
    data: data as Prisma.StudentProjectUncheckedUpdateInput,
  });

  await updateCounts(portfolio.id, student.id);
  return project;
}

export async function deleteProject(userId: string, projectId: string) {
  const { student, portfolio } = await getStudentAndPortfolio(userId);
  const existing = await prisma.studentProject.findFirst({
    where: { id: projectId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('Portfolio Project');

  await prisma.studentProject.delete({ where: { id: projectId } });
  await updateCounts(portfolio.id, student.id);
}

export async function addShowcase(userId: string, data: CreateShowcaseInput) {
  const { student, portfolio } = await getStudentAndPortfolio(userId);

  if (data.linked_internship_id) {
    const internship = await prisma.internship.findFirst({
      where: {
        id: data.linked_internship_id,
        student_id: student.id,
      },
    });

    if (!internship) {
      throw new NotFoundError('Internship record');
    }
  }

  const showcase = await prisma.internshipShowcase.create({
    data: { portfolio_id: portfolio.id, ...data },
  });
  await updateCounts(portfolio.id, student.id);
  return showcase;
}

export async function deleteShowcase(userId: string, showcaseId: string) {
  const { student, portfolio } = await getStudentAndPortfolio(userId);
  const existing = await prisma.internshipShowcase.findFirst({
    where: { id: showcaseId, portfolio_id: portfolio.id },
  });
  if (!existing) throw new NotFoundError('Internship Showcase');
  await prisma.internshipShowcase.delete({ where: { id: showcaseId } });
  await updateCounts(portfolio.id, student.id);
}

async function updateCounts(portfolioId: string, studentId: string) {
  const [projectCount, internshipCount] = await Promise.all([
    prisma.studentProject.count({ where: { student_id: studentId } }),
    prisma.internshipShowcase.count({ where: { portfolio_id: portfolioId } }),
  ]);

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { project_count: projectCount, internship_count: internshipCount },
  });
}
