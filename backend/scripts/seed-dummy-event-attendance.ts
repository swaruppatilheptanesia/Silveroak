/**
 * Seed a demo Event with eligible students + some marked attendance, so the
 * TPO Admin → Events & Drives → "Attendance" dialog has something to show.
 *
 * It creates ONE event titled with a `[DEMO]` prefix (that's how --remove finds it again),
 * links it to a company's posting(s), sets an Application Pipeline Stage when applicants exist,
 * assigns the eligible students as EventStudent rows, and pre-marks a few Present/Absent/Late.
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/seed-dummy-event-attendance.ts                 # dry-run: show what would be created
 *   tsx scripts/seed-dummy-event-attendance.ts --apply         # create it
 *   tsx scripts/seed-dummy-event-attendance.ts --apply --student="Aditi Mehta"   # pin the tenant
 *   tsx scripts/seed-dummy-event-attendance.ts --remove --apply # delete every [DEMO] event again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';
import { AttendanceStatus } from '@prisma/client';

const DEMO_PREFIX = '[DEMO]';
const MAX_STUDENTS = 8;

function parseStudentName(): string | null {
  const arg = process.argv.find((v) => v.startsWith('--student='));
  if (!arg) return null;
  return arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim() || null;
}

async function removeDemoEvents(apply: boolean) {
  const events = await prisma.event.findMany({
    where: { title: { startsWith: DEMO_PREFIX } },
    select: { id: true, title: true, _count: { select: { assigned_students: true } } },
  });
  console.log(`Found ${events.length} demo event(s).`);
  for (const e of events) console.log(`  - ${e.title} (${e._count.assigned_students} assigned)`);
  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete them.');
    return;
  }
  if (events.length === 0) return;
  // EventStudent + EventPanel cascade on event delete.
  const result = await prisma.event.deleteMany({ where: { title: { startsWith: DEMO_PREFIX } } });
  console.log(`\nDeleted ${result.count} demo event(s).`);
}

async function resolveTenantId(studentName: string | null): Promise<string | null> {
  if (studentName) {
    const student = await prisma.student.findFirst({
      where: { full_name: { contains: studentName, mode: 'insensitive' } },
      select: { tenant_id: true },
    });
    if (student) return student.tenant_id;
  }
  const company = await prisma.company.findFirst({ select: { tenant_id: true }, orderBy: { created_at: 'asc' } });
  return company?.tenant_id ?? null;
}

async function seedDemoEvent(apply: boolean, studentName: string | null) {
  const tenantId = await resolveTenantId(studentName);
  if (!tenantId) {
    console.log('No tenant found (no companies exist). Nothing to seed.');
    return;
  }
  console.log(`Tenant: ${tenantId}`);

  // A company with postings anchors the event.
  const company = await prisma.company.findFirst({
    where: { tenant_id: tenantId, postings: { some: {} } },
    select: { id: true, name: true },
    orderBy: { created_at: 'asc' },
  });
  if (!company) {
    console.log('No company with postings in this tenant. Create a posting first.');
    return;
  }

  const postings = await prisma.posting.findMany({
    where: { tenant_id: tenantId, company_id: company.id },
    select: { id: true, title: true },
    orderBy: { created_at: 'desc' },
    take: 5,
  });
  const postingIds = postings.map((p) => p.id);

  // Prefer eligible students = applicants on those postings; pick the stage with the most applicants.
  // Only lock the event to that stage if there are enough of them for a meaningful list — otherwise
  // fall back to "All" and top up with other tenant students so the attendance list isn't near-empty.
  const STAGE_MIN = 5;
  let stage: string | null = null;
  let studentIds: string[] = [];
  if (postingIds.length > 0) {
    const apps = await prisma.application.findMany({
      where: { tenant_id: tenantId, posting_id: { in: postingIds } },
      select: { student_id: true, current_stage: true },
    });
    if (apps.length > 0) {
      const byStage = new Map<string, Set<string>>();
      for (const a of apps) {
        if (!byStage.has(a.current_stage)) byStage.set(a.current_stage, new Set());
        byStage.get(a.current_stage)!.add(a.student_id);
      }
      const [bestStage, set] = [...byStage.entries()].sort((a, b) => b[1].size - a[1].size)[0]!;
      if (set.size >= STAGE_MIN) {
        stage = bestStage;
        studentIds = [...set].slice(0, MAX_STUDENTS);
      }
    }
  }

  // No stage locked (sparse applicants) → assign a healthy set of tenant students so the list is full.
  if (studentIds.length < STAGE_MIN) {
    const students = await prisma.student.findMany({
      where: { tenant_id: tenantId },
      select: { id: true },
      orderBy: { created_at: 'asc' },
      take: MAX_STUDENTS,
    });
    studentIds = Array.from(new Set([...studentIds, ...students.map((s) => s.id)])).slice(0, MAX_STUDENTS);
    stage = null;
  }

  if (studentIds.length === 0) {
    console.log('No students in this tenant to assign. Nothing to seed.');
    return;
  }

  // A valid event_type master value (or a safe fallback).
  const eventType = await prisma.masterOption.findFirst({
    where: { tenant_id: tenantId, category: 'event_type', is_active: true },
    select: { value: true },
    orderBy: { created_at: 'asc' },
  });
  const type = eventType?.value ?? 'campus_drive';

  console.log(`Company:        ${company.name}`);
  console.log(`Linked postings: ${postings.map((p) => p.title).join(', ') || '(none)'}`);
  console.log(`Pipeline stage:  ${stage ?? 'All'}`);
  console.log(`Event type:      ${type}`);
  console.log(`Students to assign: ${studentIds.length}`);

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to create the demo event + attendance.');
    return;
  }

  const now = new Date();
  const event = await prisma.event.create({
    data: {
      tenant_id: tenantId,
      company_id: company.id,
      posting_ids: postingIds,
      posting_id: postingIds[0] ?? null,
      title: `${DEMO_PREFIX} ${company.name} Drive`,
      type,
      status: 'published',
      date: now,
      start_time: '10:00',
      end_time: '16:00',
      venue: 'Auditorium A',
      reporting_time: '09:30',
      dress_code: 'Formal',
      application_stage: (stage as never) ?? null,
    },
  });

  await prisma.eventStudent.createMany({
    data: studentIds.map((student_id) => ({ event_id: event.id, student_id })),
    skipDuplicates: true,
  });

  // Pre-mark a visible mix: present, present, absent, late — the rest stay unmarked.
  const marks: AttendanceStatus[] = [
    AttendanceStatus.present,
    AttendanceStatus.present,
    AttendanceStatus.absent,
    AttendanceStatus.late,
  ];
  for (let i = 0; i < Math.min(marks.length, studentIds.length); i += 1) {
    await prisma.eventStudent.updateMany({
      where: { event_id: event.id, student_id: studentIds[i]! },
      data: { attendance: marks[i], marked_at: now },
    });
  }

  console.log(`\nCreated demo event "${event.title}" with ${studentIds.length} assigned student(s).`);
  console.log('View it: TPO Admin → Events & Drives → the [DEMO] row → "Attendance" button.');
  console.log(`Remove later: tsx scripts/seed-dummy-event-attendance.ts --remove --apply`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  if (remove) {
    await removeDemoEvents(apply);
    return;
  }
  await seedDemoEvent(apply, parseStudentName());
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
