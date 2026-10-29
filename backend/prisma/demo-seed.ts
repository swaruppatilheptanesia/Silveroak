/**
 * PlaceReady demo data — SOU side.
 *
 * Adds a few clean campus-drive Events (with enrolled students) + their postings so the PlaceReady
 * portal has real SOU drives to reflect (campus-drive picker, Overview CTC/eligibility, enrolled
 * students). Everything is tagged "[PRDEMO]" and is idempotent: a re-run deletes the previous
 * [PRDEMO] events + postings (cascading their event_students) and recreates them. It NEVER touches
 * any non-[PRDEMO] SOU data.
 *
 * Run:  cd backend && npx tsx prisma/demo-seed.ts
 * Prints the created event ids + enrolled student ids (consumed indirectly by the PlaceReady seed,
 * which reads the same events back over the service-account API).
 */
import { PrismaClient, WorkMode, PostingStatus, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

const TAG = '[PRDEMO]';
const ACADEMIC_YEAR = '2026';

/** Demo drives: company name (must already exist in SOU) + role + CTC/eligibility + how many students. */
const DRIVES = [
  {
    company: 'TechCorp Solutions',
    title: `${TAG} TechCorp Software Engineer Drive`,
    role: 'Software Engineer',
    ctc: '8 - 12 LPA',
    stipend: '35000',
    minCgpa: 6.5,
    eligibleBranches: ['Computer Science', 'Information Technology', 'BCA'],
    skills: 'DSA, Java/Python, SQL, problem solving',
    venue: 'Auditorium A',
    enroll: 12,
  },
  {
    company: 'InnovateSoft Pvt Ltd',
    title: `${TAG} InnovateSoft Full-Stack Drive`,
    role: 'Full-Stack Developer',
    ctc: '6 - 9 LPA',
    stipend: '25000',
    minCgpa: 6.0,
    eligibleBranches: ['Computer Science', 'Information Technology'],
    skills: 'React, Node.js, databases',
    venue: 'Seminar Hall 2',
    enroll: 10,
  },
  {
    company: 'Google',
    title: `${TAG} Google STEP Internship Drive`,
    role: 'Software Intern',
    ctc: '18 - 24 LPA',
    stipend: '80000',
    minCgpa: 7.5,
    eligibleBranches: ['Computer Science', 'Computer Science & Engineering'],
    skills: 'Algorithms, competitive programming, system design basics',
    venue: 'Placement Cell',
    enroll: 8,
  },
];

async function main() {
  console.log('SOU demo seed — creating campus drives with enrolled students...\n');

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'silver-oak-university' } });
  if (!tenant) throw new Error('SOU tenant "silver-oak-university" not found — run the main seed first.');
  const tenantId = tenant.id;

  const tpo = await prisma.user.findFirst({ where: { tenant_id: tenantId, role: 'tpo_admin' } });
  const createdBy = tpo?.id ?? null;

  const postingType = await prisma.masterOption.findFirst({
    where: { tenant_id: tenantId, category: 'posting_type', is_active: true },
    orderBy: { created_at: 'asc' },
  });
  if (!postingType) throw new Error('No active posting_type master found in SOU.');

  const students = await prisma.student.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, full_name: true, enrollment_number: true },
    orderBy: { created_at: 'asc' },
  });
  if (students.length === 0) throw new Error('No SOU students found to enroll.');
  console.log(`Found ${students.length} SOU students; posting_type="${postingType.value}".`);

  // --- Idempotent cleanup of previous [PRDEMO] rows (event_students cascade with the event) ---
  const oldEvents = await prisma.event.findMany({ where: { tenant_id: tenantId, title: { startsWith: TAG } }, select: { id: true } });
  if (oldEvents.length) {
    await prisma.event.deleteMany({ where: { id: { in: oldEvents.map((e) => e.id) } } });
    console.log(`Removed ${oldEvents.length} previous [PRDEMO] events.`);
  }
  await prisma.posting.deleteMany({ where: { tenant_id: tenantId, title: { startsWith: TAG } } });

  const result: { event: string; title: string; students: string[] }[] = [];
  let cursor = 0; // rotate through the student pool, overlapping across drives

  for (const d of DRIVES) {
    const company = await prisma.company.findFirst({ where: { tenant_id: tenantId, name: d.company } });
    if (!company) {
      console.warn(`! Company "${d.company}" not found — skipping ${d.title}`);
      continue;
    }

    const posting = await prisma.posting.create({
      data: {
        tenant_id: tenantId,
        company_id: company.id,
        title: `${TAG} ${d.role} - ${d.company}`,
        posting_type_master_id: postingType.id,
        academic_year: ACADEMIC_YEAR,
        role_name: d.role,
        location: 'Ahmedabad',
        locations: ['Ahmedabad'],
        work_mode: WorkMode.onsite,
        ctc: d.ctc,
        stipend: d.stipend,
        duration: '6 months',
        min_cgpa: d.minCgpa,
        eligible_branches: d.eligibleBranches,
        target_branches: d.eligibleBranches,
        skill_requirements: d.skills,
        status: PostingStatus.published,
        published_at: new Date(),
        created_by: createdBy,
      },
    });

    const event = await prisma.event.create({
      data: {
        tenant_id: tenantId,
        company_id: company.id,
        posting_id: posting.id,
        posting_ids: [posting.id],
        title: d.title,
        type: 'campus_drive',
        status: EventStatus.published,
        date: new Date(Date.now() + 10 * 86400000),
        start_time: '10:00',
        end_time: '16:00',
        venue: d.venue,
        reporting_time: '09:30',
        dress_code: 'Formal',
        instructions: 'Carry your resume, ID card and a pen.',
        faculty_coordinators: ['Prof. Amit Desai'],
        created_by: createdBy,
      },
    });

    // Enroll a rotating window of students (overlapping across drives).
    const chosen: typeof students = [];
    for (let i = 0; i < d.enroll && i < students.length; i += 1) {
      chosen.push(students[(cursor + i) % students.length]);
    }
    cursor = (cursor + Math.max(1, Math.floor(d.enroll / 2))) % students.length;

    await prisma.eventStudent.createMany({
      data: chosen.map((s) => ({ event_id: event.id, student_id: s.id })),
      skipDuplicates: true,
    });

    result.push({ event: event.id, title: d.title, students: chosen.map((s) => s.id) });
    console.log(`✓ ${d.title} — event ${event.id}, posting ${posting.id}, ${chosen.length} students enrolled`);
  }

  console.log('\nSOU demo seed complete. Events:');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
