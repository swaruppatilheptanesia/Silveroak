/**
 * Seed a sample PUBLISHED portfolio for BHUMIKABEN SOLANKI — so the faculty
 * "Department Students -> View -> Portfolio" tab can be checked on the UI.
 *
 * Idempotent: if she already has a portfolio it is left alone unless you pass --reset
 * (which deletes her existing portfolio + its projects/showcases first, via cascade).
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/seed-bhumikaben-portfolio.ts               # dry-run: show what would happen
 *   tsx scripts/seed-bhumikaben-portfolio.ts --apply       # create the portfolio
 *   tsx scripts/seed-bhumikaben-portfolio.ts --apply --reset   # wipe + recreate it
 *   tsx scripts/seed-bhumikaben-portfolio.ts --remove --apply  # delete the seeded portfolio again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

const STUDENT_NAME = 'BHUMIKABEN SOLANKI';

const apply = process.argv.includes('--apply');
const reset = process.argv.includes('--reset');
const remove = process.argv.includes('--remove');

function d(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const student = await prisma.student.findFirst({
    where: { full_name: { equals: STUDENT_NAME, mode: 'insensitive' } },
    select: { id: true, full_name: true, course: true, institute: true, portfolio: { select: { id: true } } },
  });

  if (!student) {
    console.error(`✖ No student named "${STUDENT_NAME}" found. Aborting.`);
    process.exit(1);
  }

  console.log(`Student: ${student.full_name} (${student.id})`);
  console.log(`  ${student.course} · ${student.institute}`);
  console.log(`  existing portfolio: ${student.portfolio ? student.portfolio.id : 'none'}`);
  console.log(`Mode: ${remove ? 'REMOVE' : reset ? 'RESET + CREATE' : 'CREATE'} | ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  // ---- REMOVE ---------------------------------------------------------------
  if (remove) {
    if (!student.portfolio) {
      console.log('Nothing to remove — she has no portfolio.');
      return;
    }
    console.log(`Would delete portfolio ${student.portfolio.id} (+ its projects & showcases via cascade).`);
    if (apply) {
      // student_projects reference the portfolio with onDelete: Cascade, but also carry student_id;
      // delete any of hers explicitly too, to be safe.
      await prisma.studentProject.deleteMany({ where: { student_id: student.id } });
      await prisma.portfolio.delete({ where: { id: student.portfolio.id } });
      console.log('✔ Removed.');
    }
    return;
  }

  // ---- guard: already exists ------------------------------------------------
  if (student.portfolio && !reset) {
    console.log('She already has a portfolio. Re-run with --reset to replace it, or --remove to delete it.');
    return;
  }

  // ---- data to create -------------------------------------------------------
  const projects = [
    {
      title: 'Campus Placement Portal',
      role: 'Full-Stack Developer',
      description:
        'A training-and-placement portal for the university with role-based dashboards, posting management and an offer workflow. Built the applications module and the notification system.',
      technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Prisma'],
      keywords: ['web', 'placement', 'rbac'],
      github_url: 'https://github.com/example/campus-placement-portal',
      live_url: 'https://placement.example.edu',
      start_date: d('2025-07-01'),
      end_date: d('2025-11-30'),
      is_ongoing: false,
      display_order: 0,
    },
    {
      title: 'Handwritten Digit Recognizer',
      role: 'ML Engineer',
      description:
        'A CNN trained on MNIST to recognise handwritten digits, served through a small Flask API with a drawing canvas front-end. Reached 99.1% test accuracy.',
      technologies: ['Python', 'TensorFlow', 'Flask', 'NumPy'],
      keywords: ['machine-learning', 'cnn', 'computer-vision'],
      github_url: 'https://github.com/example/digit-recognizer',
      live_url: null,
      start_date: d('2025-02-01'),
      end_date: d('2025-04-15'),
      is_ongoing: false,
      display_order: 1,
    },
    {
      title: 'IoT Smart Energy Monitor',
      role: 'Embedded + Backend',
      description:
        'An ESP32-based energy monitor that streams live consumption to a dashboard and raises alerts on unusual spikes. Currently extending it with weekly usage reports.',
      technologies: ['C++', 'ESP32', 'MQTT', 'Node.js', 'Chart.js'],
      keywords: ['iot', 'realtime', 'dashboard'],
      github_url: 'https://github.com/example/smart-energy-monitor',
      live_url: null,
      start_date: d('2026-01-10'),
      end_date: null,
      is_ongoing: true,
      display_order: 2,
    },
  ];

  const showcases = [
    {
      company_name: 'Infosys',
      role: 'Software Engineering Intern',
      duration_months: 3,
      start_date: d('2025-05-01'),
      end_date: d('2025-07-31'),
      key_outcomes: [
        'Built REST APIs for an internal HR tool used by ~400 employees.',
        'Cut a nightly batch job’s runtime by 40% by adding proper indexes.',
        'Wrote the integration test suite that now gates the module’s CI.',
      ],
      is_verified: true,
    },
    {
      company_name: 'BrightWave Analytics',
      role: 'Data Science Intern',
      duration_months: 2,
      start_date: d('2024-12-01'),
      end_date: d('2025-01-31'),
      key_outcomes: [
        'Cleaned and modelled a 1.2M-row sales dataset for a churn study.',
        'Presented findings that informed the retention campaign for Q1.',
      ],
      is_verified: false,
    },
  ];

  console.log(`Would create a PUBLISHED portfolio with ${projects.length} projects and ${showcases.length} internship showcases:`);
  projects.forEach((p) => console.log(`  • project: ${p.title} (${p.technologies.join(', ')})`));
  showcases.forEach((s) => console.log(`  • showcase: ${s.role} @ ${s.company_name}${s.is_verified ? ' [verified]' : ''}`));

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (student.portfolio && reset) {
      await tx.studentProject.deleteMany({ where: { student_id: student.id } });
      await tx.portfolio.delete({ where: { id: student.portfolio.id } });
    }

    const portfolio = await tx.portfolio.create({
      data: {
        student_id: student.id,
        status: 'published',
        project_count: projects.length,
        internship_count: showcases.length,
      },
    });

    for (const p of projects) {
      await tx.studentProject.create({
        data: { student_id: student.id, portfolio_id: portfolio.id, ...p },
      });
    }

    for (const s of showcases) {
      await tx.internshipShowcase.create({
        data: { portfolio_id: portfolio.id, ...s },
      });
    }

    console.log(`\n✔ Created portfolio ${portfolio.id} (published) with ${projects.length} projects + ${showcases.length} showcases.`);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
