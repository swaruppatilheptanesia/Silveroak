/**
 * Read-only diagnostic: for each faculty coordinator, show what the new
 * filter-options endpoint would return, plus the raw data it's querying.
 *
 * Usage: tsx scripts/diagnose-faculty-filter-options.ts
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

async function main() {
  const faculties = await prisma.user.findMany({
    where: { role: 'faculty_coordinator' },
    select: {
      id: true,
      email: true,
      name: true,
      tenant_id: true,
      department: true,
      branches: true,
      institutes: true,
    },
  });

  if (faculties.length === 0) {
    console.log('No faculty_coordinator users found.');
    return;
  }

  console.log(`Found ${faculties.length} faculty user(s).\n`);

  for (const faculty of faculties) {
    const department = faculty.department ?? faculty.branches?.[0] ?? null;

    console.log('─'.repeat(72));
    console.log(`Faculty: ${faculty.name} <${faculty.email}>`);
    console.log(`  tenant_id : ${faculty.tenant_id}`);
    console.log(`  department: ${faculty.department ?? '(null)'}`);
    console.log(`  branches  : ${JSON.stringify(faculty.branches)}`);
    console.log(`  institutes: ${JSON.stringify(faculty.institutes)}`);
    console.log(`  scope dept resolved to: ${department ?? '(none — endpoint will 403)'}`);

    if (!department) continue;

    const studentCount = await prisma.student.count({
      where: { tenant_id: faculty.tenant_id, department },
    });
    console.log(`  Students in dept ${department}: ${studentCount}`);

    const allInstitutes = await prisma.student.findMany({
      where: { tenant_id: faculty.tenant_id, department },
      select: { institute: true },
    });
    const nullInstitutes = allInstitutes.filter((r) => !r.institute).length;
    const nonNullInstitutes = allInstitutes.filter((r) => Boolean(r.institute)).length;
    const distinctInstitutes = [...new Set(allInstitutes.map((r) => r.institute).filter(Boolean))];
    console.log(
      `  Institute column: ${nonNullInstitutes} populated, ${nullInstitutes} null. Distinct: ${JSON.stringify(distinctInstitutes)}`,
    );

    const branchMasterCount = await prisma.masterOption.count({
      where: { tenant_id: faculty.tenant_id, category: 'branch', is_active: true },
    });
    const branchMasterSample = await prisma.masterOption.findMany({
      where: { tenant_id: faculty.tenant_id, category: 'branch', is_active: true },
      select: { value: true },
      take: 10,
    });
    console.log(
      `  Master 'branch' (active) count: ${branchMasterCount}. Sample: ${JSON.stringify(branchMasterSample.map((b) => b.value))}`,
    );

    const studentIds = await prisma.student.findMany({
      where: { tenant_id: faculty.tenant_id, department },
      select: { id: true },
    });
    if (studentIds.length > 0) {
      const academicCount = await prisma.academicProfile.count({
        where: { student_id: { in: studentIds.map((s) => s.id) } },
      });
      const allSemesters = await prisma.academicProfile.findMany({
        where: { student_id: { in: studentIds.map((s) => s.id) } },
        select: { semester: true },
      });
      const nullSemesters = allSemesters.filter((r) => r.semester == null).length;
      const distinctSemesters = [...new Set(allSemesters.map((r) => r.semester).filter((v): v is number => v != null))].sort((a, b) => a - b);
      console.log(
        `  AcademicProfile rows: ${academicCount}. semester null: ${nullSemesters}. distinct semesters: ${JSON.stringify(distinctSemesters)}`,
      );
    }
  }

  console.log('─'.repeat(72));
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
