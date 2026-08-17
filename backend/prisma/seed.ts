import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  PERMISSION_MODULES,
  PERMISSION_ROLES,
  getDefaultPermissionFlags,
} from '../src/shared/permissions';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password@123';

type SeedUserKey =
  | 'super_admin'
  | 'tpo_admin'
  | 'tpo_employee'
  | 'faculty_coordinator'
  | 'student'
  | 'student_alt'
  | 'recruiter'
  | 'management';

async function findOrCreate<T>(existing: T | null, create: () => Promise<T>): Promise<T> {
  return existing ?? create();
}

async function main() {
  console.log('Seeding database...\n');

  // 1. Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'silver-oak-university' },
    update: {},
    create: {
      slug: 'silver-oak-university',
      name: 'Silver Oak University',
      short_name: 'SOU',
      tagline: 'Training & Placement Portal',
      contact_email: 'tpo@silveroak.ac.in',
      contact_phone: '+91-79-61900100',
      website: 'https://www.silveroak.ac.in',
      config: {
        academic_year: '2025-26',
        max_resumes: 5,
        max_file_size_mb: 5,
        allowed_resume_types: ['application/pdf'],
        placement_policy_version: '1.0',
      },
    },
  });
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create users (one per role)
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const usersData: { key: SeedUserKey; email: string; role: UserRole; name: string; department?: string; designation?: string }[] = [
    { key: 'super_admin', email: 'superadmin@silveroak.ac.in', role: 'super_admin', name: 'System Administrator', designation: 'Super Admin' },
    { key: 'tpo_admin', email: 'tpoadmin@silveroak.ac.in', role: 'tpo_admin', name: 'Dr. Rajesh Patel', department: 'Training & Placement', designation: 'TPO Director' },
    { key: 'tpo_employee', email: 'tpoemployee@silveroak.ac.in', role: 'tpo_employee', name: 'Priya Shah', department: 'Training & Placement', designation: 'Placement Coordinator' },
    { key: 'faculty_coordinator', email: 'faculty@silveroak.ac.in', role: 'faculty_coordinator', name: 'Prof. Amit Desai', department: 'Computer Science', designation: 'Faculty Coordinator' },
    { key: 'student', email: 'student@silveroak.ac.in', role: 'student', name: 'Rahul Sharma', department: 'Computer Science' },
    { key: 'student_alt', email: 'aditi@silveroak.ac.in', role: 'student', name: 'Aditi Mehta', department: 'Information Technology' },
    { key: 'recruiter', email: 'recruiter@techcorp.com', role: 'recruiter', name: 'Sarah Johnson', designation: 'HR Manager' },
    { key: 'management', email: 'management@silveroak.ac.in', role: 'management', name: 'Dr. Vikas Modi', designation: 'Dean - Academics' },
  ];

  const users: Record<SeedUserKey, string> = {} as Record<SeedUserKey, string>;

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: u.email } },
      update: {},
      create: {
        tenant_id: tenant.id,
        email: u.email,
        password_hash: passwordHash,
        role: u.role,
        name: u.name,
        department: u.department,
        designation: u.designation,
      },
    });
    users[u.key] = user.id;
    console.log(`  User: ${u.name} (${u.role}) - ${u.email}`);
  }

  // 3. Create student profile for the student user
  const student = await prisma.student.upsert({
    where: { tenant_id_enrollment_number: { tenant_id: tenant.id, enrollment_number: 'SOU2023CS001' } },
    update: {},
    create: {
      user_id: users.student,
      tenant_id: tenant.id,
      enrollment_number: 'SOU2023CS001',
      roll_number: 'CS-23-001',
      full_name: 'Rahul Sharma',
      email: 'student@silveroak.ac.in',
      mobile: '+91-9876543210',
      date_of_birth: new Date('2002-05-15'),
      gender: 'Male',
      department: 'Computer Science',
      batch: '2023-27',
      course: 'B.Tech Computer Science',
      institute: 'Silver Oak University',
      profile_completion_percentage: 90,
      verification_status: 'verified',
      verified_by: users.tpo_admin,
      verified_at: new Date('2026-03-20'),
      policy_accepted: true,
      policy_accepted_at: new Date('2026-03-20'),
    },
  });
  console.log(`\n  Student: ${student.full_name} (${student.enrollment_number})`);

  // Academic profile
  await prisma.academicProfile.upsert({
    where: { student_id: student.id },
    update: {},
    create: {
      student_id: student.id,
      cgpa: 8.5,
      tenth_percentage: 92.4,
      twelfth_percentage: 88.6,
      backlog_count: 0,
      active_backlogs: 0,
      semester: 5,
      year_of_study: 3,
      course_duration: 4,
    },
  });

  // Skills profile
  await prisma.skillsProfile.upsert({
    where: { student_id: student.id },
    update: {},
    create: {
      student_id: student.id,
      technical_skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python'],
      domain_interests: ['Web Development', 'Cloud Computing', 'Machine Learning'],
      preferred_locations: ['Ahmedabad', 'Bangalore', 'Pune', 'Remote'],
    },
  });

  // 4. Create sample companies
  const companiesData = [
    { name: 'TechCorp Solutions', industry: 'Information Technology', website: 'https://techcorp.example.com', classification: 'preferred' as const },
    { name: 'InnovateSoft Pvt Ltd', industry: 'Software Development', website: 'https://innovatesoft.example.com', classification: 'preferred' as const },
    { name: 'DataDriven Analytics', industry: 'Data Analytics', website: 'https://datadriven.example.com', classification: 'normal' as const },
    { name: 'CloudNine Services', industry: 'Cloud Computing', website: 'https://cloudnine.example.com', classification: 'normal' as const },
    { name: 'CyberShield Security', industry: 'Cybersecurity', website: 'https://cybershield.example.com', classification: 'normal' as const },
  ];

  const companies: string[] = [];
  for (const c of companiesData) {
    let company = await prisma.company.findFirst({
      where: { tenant_id: tenant.id, name: c.name },
    });
    if (!company) {
      company = await prisma.company.create({
        data: {
          tenant_id: tenant.id,
          name: c.name,
          industry: c.industry,
          website: c.website,
          classification: c.classification,
          description: `${c.name} - a leading company in ${c.industry}`,
        },
      });
    }
    companies.push(company.id);
    console.log(`  Company: ${c.name} (${c.classification})`);
  }

  // 5. Create recruiter profile linked to first company
  await prisma.recruiter.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'recruiter@techcorp.com' } },
    update: {},
    create: {
      user_id: users.recruiter,
      company_id: companies[0],
      tenant_id: tenant.id,
      name: 'Sarah Johnson',
      email: 'recruiter@techcorp.com',
      phone: '+1-555-0100',
      designation: 'HR Manager',
      verification_status: 'verified',
      verified_by: users.tpo_admin,
      verified_at: new Date(),
    },
  });
  console.log('  Recruiter: Sarah Johnson linked to TechCorp Solutions');

  // 6. Create role permissions matrix
  console.log('\nSeeding role permissions...');
  let permCount = 0;

  for (const role of PERMISSION_ROLES) {
    for (const module of PERMISSION_MODULES) {
      await prisma.rolePermission.upsert({
        where: {
          tenant_id_role_module: { tenant_id: tenant.id, role, module },
        },
        update: getDefaultPermissionFlags(role, module),
        create: {
          tenant_id: tenant.id,
          role,
          module,
          ...getDefaultPermissionFlags(role, module),
        },
      });
      permCount++;
    }
  }
  console.log(`  Created ${permCount} role-permission entries (${PERMISSION_ROLES.length} roles x ${PERMISSION_MODULES.length} modules)`);

  // 7. Create a sample policy (idempotent)
  const existingPolicy = await prisma.policy.findFirst({
    where: { tenant_id: tenant.id, title: 'Placement Policy 2025-26' },
  });
  if (!existingPolicy) await prisma.policy.create({
    data: {
      tenant_id: tenant.id,
      title: 'Placement Policy 2025-26',
      category: 'placement',
      description: 'Official placement policy for the academic year 2025-26',
      content: `# Placement Policy 2025-26

## 1. Eligibility Criteria
- Minimum CGPA: 6.0
- No active backlogs at the time of application
- Profile must be 80% complete
- Placement policy must be accepted

## 2. Application Rules
- Students can apply to multiple companies simultaneously
- Once an offer is accepted, the student is blocked from further applications
- Mock round must be passed before progressing to company rounds

## 3. Offer Management
- Only one active offer is allowed per student
- TPO admin can override the single-offer policy in exceptional cases
- Offers not responded to within 7 days will be escalated

## 4. Code of Conduct
- Students must attend all scheduled interviews
- No-show without prior notice will result in a warning
- Three warnings may lead to placement ban for the semester`,
      version: '1.0',
      effective_date: new Date('2025-07-01'),
      updated_by: 'Dr. Rajesh Patel',
    },
  });
  console.log('\n  Policy: Placement Policy 2025-26');

  // 8. Create sample eligibility rule (idempotent)
  const existingRule = await prisma.eligibilityRule.findFirst({
    where: { tenant_id: tenant.id, rule_name: 'Standard IT Company Criteria' },
  });
  if (!existingRule) await prisma.eligibilityRule.create({
    data: {
      tenant_id: tenant.id,
      rule_name: 'Standard IT Company Criteria',
      min_cgpa: 6.0,
      max_backlogs: 0,
      eligible_branches: ['Computer Science', 'Information Technology', 'Electronics & Communication'],
      eligible_batches: ['2023-27', '2022-26'],
      min_tenth: 60.0,
      min_twelfth: 60.0,
      additional_criteria: 'No active backlogs at the time of application',
    },
  });
  console.log('  Eligibility Rule: Standard IT Company Criteria');

  // 9. Seed student-facing profile, portfolio, and circular data
  const studentAlt = await prisma.student.upsert({
    where: { tenant_id_enrollment_number: { tenant_id: tenant.id, enrollment_number: 'SOU2022IT017' } },
    update: {},
    create: {
      user_id: users.student_alt,
      tenant_id: tenant.id,
      enrollment_number: 'SOU2022IT017',
      roll_number: 'IT-22-017',
      full_name: 'Aditi Mehta',
      email: 'aditi@silveroak.ac.in',
      mobile: '+91-9876501234',
      date_of_birth: new Date('2001-08-21'),
      gender: 'Female',
      department: 'Information Technology',
      batch: '2022-26',
      course: 'B.Tech Information Technology',
      institute: 'Silver Oak University',
      profile_completion_percentage: 95,
      verification_status: 'verified',
      verified_by: users.tpo_admin,
      verified_at: new Date('2026-03-18'),
      policy_accepted: true,
      policy_accepted_at: new Date('2026-03-18'),
    },
  });

  await prisma.academicProfile.upsert({
    where: { student_id: studentAlt.id },
    update: {},
    create: {
      student_id: studentAlt.id,
      cgpa: 7.94,
      tenth_percentage: 88.0,
      twelfth_percentage: 86.5,
      backlog_count: 0,
      active_backlogs: 0,
      semester: 8,
      year_of_study: 4,
      course_duration: 4,
    },
  });

  await prisma.skillsProfile.upsert({
    where: { student_id: studentAlt.id },
    update: {},
    create: {
      student_id: studentAlt.id,
      technical_skills: ['Java', 'Python', 'SQL', 'Power BI', 'Excel', 'AWS'],
      domain_interests: ['Data Analytics', 'Cloud Operations', 'Business Intelligence'],
      preferred_locations: ['Ahmedabad', 'Bangalore', 'Remote'],
    },
  });

  const [techcorpCompanyId, innovatesoftCompanyId, , cloudnineCompanyId] = companies;

  const rahulResume = await findOrCreate(
    await prisma.resume.findFirst({
      where: { student_id: student.id, name: 'Rahul Sharma - ATS Resume' },
    }),
    () => prisma.resume.create({
      data: {
        student_id: student.id,
        name: 'Rahul Sharma - ATS Resume',
        file_url: '/uploads/resumes/rahul-sharma.pdf',
        file_size: 248000,
        mime_type: 'application/pdf',
        is_default: true,
        ai_score: 84,
      },
    })
  );

  const aditiResume = await findOrCreate(
    await prisma.resume.findFirst({
      where: { student_id: studentAlt.id, name: 'Aditi Mehta - Placement Resume' },
    }),
    () => prisma.resume.create({
      data: {
        student_id: studentAlt.id,
        name: 'Aditi Mehta - Placement Resume',
        file_url: '/uploads/resumes/aditi-mehta.pdf',
        file_size: 252000,
        mime_type: 'application/pdf',
        is_default: true,
        ai_score: 89,
      },
    })
  );

  await findOrCreate(
    await prisma.policyAcceptance.findFirst({ where: { student_id: student.id } }),
    () => prisma.policyAcceptance.create({
      data: {
        student_id: student.id,
        policy_read: true,
        rules_accepted: true,
        profile_sharing_consent: true,
        resume_sharing_consent: true,
        data_storage_consent: true,
        communication_consent: true,
        ip_address: '127.0.0.1',
      },
    })
  );

  await findOrCreate(
    await prisma.policyAcceptance.findFirst({ where: { student_id: studentAlt.id } }),
    () => prisma.policyAcceptance.create({
      data: {
        student_id: studentAlt.id,
        policy_read: true,
        rules_accepted: true,
        profile_sharing_consent: true,
        resume_sharing_consent: true,
        data_storage_consent: true,
        communication_consent: true,
        ip_address: '127.0.0.2',
      },
    })
  );

  await prisma.interestRegistration.upsert({
    where: { student_id_interest_type: { student_id: student.id, interest_type: 'placement' } },
    update: {},
    create: { student_id: student.id, interest_type: 'placement' },
  });
  await prisma.interestRegistration.upsert({
    where: { student_id_interest_type: { student_id: student.id, interest_type: 'final_semester_internship' } },
    update: {},
    create: { student_id: student.id, interest_type: 'final_semester_internship' },
  });
  await prisma.interestRegistration.upsert({
    where: { student_id_interest_type: { student_id: studentAlt.id, interest_type: 'summer_internship' } },
    update: {},
    create: { student_id: studentAlt.id, interest_type: 'summer_internship' },
  });
  await prisma.interestRegistration.upsert({
    where: { student_id_interest_type: { student_id: studentAlt.id, interest_type: 'stipend_internship' } },
    update: {},
    create: { student_id: studentAlt.id, interest_type: 'stipend_internship' },
  });

  const rahulPortfolio = await prisma.portfolio.upsert({
    where: { student_id: student.id },
    update: { status: 'published', project_count: 2, internship_count: 0 },
    create: {
      student_id: student.id,
      status: 'published',
      project_count: 2,
      internship_count: 0,
    },
  });

  const aditiPortfolio = await prisma.portfolio.upsert({
    where: { student_id: studentAlt.id },
    update: { status: 'published', project_count: 1, internship_count: 1 },
    create: {
      student_id: studentAlt.id,
      status: 'published',
      project_count: 1,
      internship_count: 1,
    },
  });

  await findOrCreate(
    await prisma.studentProject.findFirst({
      where: { student_id: student.id, title: 'Campus Connect' },
    }),
    () => prisma.studentProject.create({
      data: {
        student_id: student.id,
        title: 'Campus Connect',
        description: 'A placement readiness dashboard for students and recruiters.',
        technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        github_url: 'https://github.com/example/campus-connect',
        demo_url: 'https://demo.example.com/campus-connect',
        start_date: new Date('2025-08-01'),
        end_date: new Date('2025-11-15'),
      },
    })
  );

  await findOrCreate(
    await prisma.studentProject.findFirst({
      where: { student_id: student.id, title: 'Interview Drill' },
    }),
    () => prisma.studentProject.create({
      data: {
        student_id: student.id,
        title: 'Interview Drill',
        description: 'Interactive practice space for coding and HR interview rounds.',
        technologies: ['React', 'Tailwind CSS', 'Zustand'],
        github_url: 'https://github.com/example/interview-drill',
        demo_url: 'https://demo.example.com/interview-drill',
        start_date: new Date('2025-09-10'),
        is_ongoing: true,
      },
    })
  );

  await findOrCreate(
    await prisma.studentProject.findFirst({
      where: { student_id: studentAlt.id, title: 'InsightLens Analytics' },
    }),
    () => prisma.studentProject.create({
      data: {
        student_id: studentAlt.id,
        title: 'InsightLens Analytics',
        description: 'An analytics workspace for turning placement data into actionable insights.',
        technologies: ['Python', 'SQL', 'Power BI'],
        github_url: 'https://github.com/example/insightlens-analytics',
        demo_url: 'https://demo.example.com/insightlens-analytics',
        start_date: new Date('2025-07-20'),
        end_date: new Date('2025-10-05'),
      },
    })
  );

  await findOrCreate(
    await prisma.certification.findFirst({
      where: { student_id: student.id, name: 'AWS Cloud Practitioner' },
    }),
    () => prisma.certification.create({
      data: {
        student_id: student.id,
        name: 'AWS Cloud Practitioner',
        issuer: 'Amazon Web Services',
        issue_date: new Date('2025-12-10'),
        credential_url: 'https://credentials.example.com/aws-cloud-practitioner',
      },
    })
  );

  await findOrCreate(
    await prisma.certification.findFirst({
      where: { student_id: studentAlt.id, name: 'Google Data Analytics' },
    }),
    () => prisma.certification.create({
      data: {
        student_id: studentAlt.id,
        name: 'Google Data Analytics',
        issuer: 'Google',
        issue_date: new Date('2025-11-18'),
        credential_url: 'https://credentials.example.com/google-data-analytics',
      },
    })
  );

  await findOrCreate(
    await prisma.studentProject.findFirst({
      where: { student_id: rahulStudent.id, title: 'Campus Connect' },
    }),
    () => prisma.studentProject.create({
      data: {
        student_id: rahulStudent.id,
        portfolio_id: rahulPortfolio.id,
        title: 'Campus Connect',
        description: 'Built a student-facing placement readiness dashboard and recruiter checklist.',
        role: 'Full Stack Developer',
        technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        keywords: ['placement', 'dashboard', 'recruiter'],
        github_url: 'https://github.com/example/campus-connect',
        live_url: 'https://demo.example.com/campus-connect',
        start_date: new Date('2025-08-01'),
        end_date: new Date('2025-11-15'),
        display_order: 1,
      },
    })
  );

  await findOrCreate(
    await prisma.studentProject.findFirst({
      where: { student_id: rahulStudent.id, title: 'Interview Drill' },
    }),
    () => prisma.studentProject.create({
      data: {
        student_id: rahulStudent.id,
        portfolio_id: rahulPortfolio.id,
        title: 'Interview Drill',
        description: 'Mock interview workflows with feedback capture and ATS scoring.',
        role: 'Frontend Developer',
        technologies: ['React', 'Tailwind CSS', 'Zustand'],
        keywords: ['interview', 'practice', 'mock-round'],
        github_url: 'https://github.com/example/interview-drill',
        live_url: 'https://demo.example.com/interview-drill',
        start_date: new Date('2025-09-10'),
        is_ongoing: true,
        display_order: 2,
      },
    })
  );

  await findOrCreate(
    await prisma.studentProject.findFirst({
      where: { student_id: aditiStudent.id, title: 'InsightLens Analytics' },
    }),
    () => prisma.studentProject.create({
      data: {
        student_id: aditiStudent.id,
        portfolio_id: aditiPortfolio.id,
        title: 'InsightLens Analytics',
        description: 'Interactive analytics workspace for placement trends and hiring funnels.',
        role: 'Data Analyst',
        technologies: ['Python', 'SQL', 'Power BI'],
        keywords: ['analytics', 'placement', 'dashboards'],
        github_url: 'https://github.com/example/insightlens-analytics',
        live_url: 'https://demo.example.com/insightlens-analytics',
        start_date: new Date('2025-07-20'),
        end_date: new Date('2025-10-05'),
        display_order: 1,
      },
    })
  );

  const techcorpEngagement = await findOrCreate(
    await prisma.companyEngagement.findFirst({
      where: {
        company_id: techcorpCompanyId,
        visitor_type: 'campus_visit',
        date: new Date('2026-03-24'),
      },
    }),
    () => prisma.companyEngagement.create({
      data: {
        company_id: techcorpCompanyId,
        tenant_id: tenant.id,
        visitor_type: 'campus_visit',
        date: new Date('2026-03-24'),
        remarks: 'Campus visit and pre-placement talk for CS batch 2023-27',
        students_hired: 4,
        packages_offered: '8.0 - 12.0 LPA',
        academic_year: '2025-26',
        created_by: users.tpo_admin,
      },
    })
  );

  const innovatesoftEngagement = await findOrCreate(
    await prisma.companyEngagement.findFirst({
      where: {
        company_id: innovatesoftCompanyId,
        visitor_type: 'guest_lecture',
        date: new Date('2026-03-30'),
      },
    }),
    () => prisma.companyEngagement.create({
      data: {
        company_id: innovatesoftCompanyId,
        tenant_id: tenant.id,
        visitor_type: 'guest_lecture',
        date: new Date('2026-03-30'),
        remarks: 'Guest lecture on analytics careers and internship hiring process',
        students_hired: 0,
        packages_offered: 'Internship stipend 25,000/month',
        academic_year: '2025-26',
        created_by: users.tpo_employee,
      },
    })
  );

  const placementTemplate = await findOrCreate(
    await prisma.circularTemplate.findFirst({
      where: { tenant_id: tenant.id, name: 'Placement Drive Template' },
    }),
    () => prisma.circularTemplate.create({
      data: {
        tenant_id: tenant.id,
        name: 'Placement Drive Template',
        type: 'placement',
        status: 'active',
        version: '1.0',
        sections: [
          { title: 'Overview', body: 'Placement circular for a campus drive.' },
          { title: 'Eligibility', body: 'Eligible branches, batches, and CGPA rules.' },
          { title: 'Documents', body: 'Resume, ID card, and offer-ready documents.' },
        ],
        created_by: users.tpo_admin,
      },
    })
  );

  const internshipTemplate = await findOrCreate(
    await prisma.circularTemplate.findFirst({
      where: { tenant_id: tenant.id, name: 'Internship Orientation Template' },
    }),
    () => prisma.circularTemplate.create({
      data: {
        tenant_id: tenant.id,
        name: 'Internship Orientation Template',
        type: 'internship',
        status: 'active',
        version: '1.0',
        sections: [
          { title: 'Overview', body: 'Internship orientation and onboarding circular.' },
          { title: 'Schedule', body: 'Reporting time, start date, and mentor details.' },
          { title: 'Guidelines', body: 'Attendance, reporting, and stipend rules.' },
        ],
        created_by: users.tpo_employee,
      },
    })
  );

  const techcorpCircular = await findOrCreate(
    await prisma.generatedCircular.findFirst({
      where: {
        tenant_id: tenant.id,
        company_id: techcorpCompanyId,
        role_name: 'Software Engineer',
      },
    }),
    () => prisma.generatedCircular.create({
      data: {
        tenant_id: tenant.id,
        template_id: placementTemplate.id,
        company_id: techcorpCompanyId,
        company_name: 'TechCorp Solutions',
        role_name: 'Software Engineer',
        type: 'placement',
        field_values: {
          drive_date: '2026-03-24',
          venue: 'Main Auditorium',
          start_time: '09:30',
        },
        generated_by: users.tpo_admin,
      },
    })
  );

  const innovatesoftCircular = await findOrCreate(
    await prisma.generatedCircular.findFirst({
      where: {
        tenant_id: tenant.id,
        company_id: innovatesoftCompanyId,
        role_name: 'Data Analyst Intern',
      },
    }),
    () => prisma.generatedCircular.create({
      data: {
        tenant_id: tenant.id,
        template_id: internshipTemplate.id,
        company_id: innovatesoftCompanyId,
        company_name: 'InnovateSoft Pvt Ltd',
        role_name: 'Data Analyst Intern',
        type: 'internship',
        field_values: {
          onboarding_date: '2026-04-01',
          mentor: 'InnovateSoft Mentorship Team',
          mode: 'Remote',
        },
        generated_by: users.tpo_employee,
      },
    })
  );

  // 10. Seed core flow records used by the UI and API flows
  const techcorpPosting = await findOrCreate(
    await prisma.posting.findFirst({
      where: {
        tenant_id: tenant.id,
        company_id: techcorpCompanyId,
        title: 'Campus Drive - Software Engineer 2026',
      },
    }),
    () => prisma.posting.create({
      data: {
        tenant_id: tenant.id,
        company_id: techcorpCompanyId,
        title: 'Campus Drive - Software Engineer 2026',
        type: 'job',
        academic_year: '2025-26',
        role_name: 'Software Engineer',
        location: 'Ahmedabad',
        work_mode: 'onsite',
        ctc: '8.4 LPA',
        role_description: 'Develop full-stack modules for the student placement portal.',
        eligible_branches: ['Computer Science'],
        eligible_batches: ['2023-27'],
        min_cgpa: 7.0,
        max_backlogs: 0,
        skill_requirements: 'TypeScript, React, Node.js, SQL',
        has_written_test: true,
        written_test_details: 'Coding and aptitude assessment',
        has_gd: true,
        gd_details: 'Group discussion on product thinking',
        technical_rounds: 2,
        hr_rounds: 1,
        additional_info: 'Shortlisted students will receive interview details by email.',
        application_start_date: new Date('2026-03-20'),
        application_end_date: new Date('2026-04-05'),
        status: 'published',
        published_at: new Date('2026-03-19'),
        created_by: users.tpo_admin,
      },
    })
  );

  const innovatesoftPosting = await findOrCreate(
    await prisma.posting.findFirst({
      where: {
        tenant_id: tenant.id,
        company_id: innovatesoftCompanyId,
        title: 'Summer Internship - Data Analyst 2026',
      },
    }),
    () => prisma.posting.create({
      data: {
        tenant_id: tenant.id,
        company_id: innovatesoftCompanyId,
        title: 'Summer Internship - Data Analyst 2026',
        type: 'internship',
        academic_year: '2025-26',
        role_name: 'Data Analyst Intern',
        location: 'Remote',
        work_mode: 'remote',
        stipend: '25000/month',
        duration: '3 months',
        role_description: 'Build dashboards and automate reporting for the analytics team.',
        eligible_branches: ['Information Technology'],
        eligible_batches: ['2022-26'],
        min_cgpa: 7.0,
        max_backlogs: 0,
        skill_requirements: 'Python, SQL, Power BI',
        has_written_test: false,
        has_gd: false,
        technical_rounds: 1,
        hr_rounds: 1,
        additional_info: 'Remote internship with weekly mentor check-ins.',
        application_start_date: new Date('2026-03-22'),
        application_end_date: new Date('2026-04-08'),
        status: 'published',
        published_at: new Date('2026-03-21'),
        created_by: users.tpo_employee,
      },
    })
  );

  const rahulApplication = await prisma.application.upsert({
    where: {
      student_id_posting_id: {
        student_id: student.id,
        posting_id: techcorpPosting.id,
      },
    },
    update: {
      resume_id: rahulResume.id,
      current_stage: 'offer_released',
      mock_round_result: 'passed',
    },
    create: {
      tenant_id: tenant.id,
      student_id: student.id,
      posting_id: techcorpPosting.id,
      resume_id: rahulResume.id,
      current_stage: 'offer_released',
      mock_round_result: 'passed',
    },
  });

  const aditiApplication = await prisma.application.upsert({
    where: {
      student_id_posting_id: {
        student_id: studentAlt.id,
        posting_id: innovatesoftPosting.id,
      },
    },
    update: {
      resume_id: aditiResume.id,
      current_stage: 'offer_released',
      mock_round_result: 'passed',
    },
    create: {
      tenant_id: tenant.id,
      student_id: studentAlt.id,
      posting_id: innovatesoftPosting.id,
      resume_id: aditiResume.id,
      current_stage: 'offer_released',
      mock_round_result: 'passed',
    },
  });

  const recruiterProfile = await prisma.recruiter.findUnique({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'recruiter@techcorp.com' } },
  });

  const stageSeeds = [
    { applicationId: rahulApplication.id, fromStage: null, toStage: 'applied', changedBy: users.student, remarks: 'Application submitted' },
    { applicationId: rahulApplication.id, fromStage: 'applied', toStage: 'mock_round', changedBy: users.tpo_employee, remarks: 'Mock round scheduled and completed' },
    { applicationId: rahulApplication.id, fromStage: 'mock_round', toStage: 'shortlisted', changedBy: users.tpo_employee, remarks: 'Candidate shortlisted for interviews' },
    { applicationId: rahulApplication.id, fromStage: 'shortlisted', toStage: 'offer_released', changedBy: users.tpo_admin, remarks: 'Offer released to student' },
    { applicationId: aditiApplication.id, fromStage: null, toStage: 'applied', changedBy: users.student_alt, remarks: 'Application submitted' },
    { applicationId: aditiApplication.id, fromStage: 'applied', toStage: 'shortlisted', changedBy: users.tpo_employee, remarks: 'Shortlisted after screening' },
    { applicationId: aditiApplication.id, fromStage: 'shortlisted', toStage: 'offer_released', changedBy: users.tpo_admin, remarks: 'Internship offer released' },
  ] as const;

  for (const stage of stageSeeds) {
    await findOrCreate(
      await prisma.applicationStageHistory.findFirst({
        where: {
          application_id: stage.applicationId,
          to_stage: stage.toStage,
        },
      }),
      () => prisma.applicationStageHistory.create({
        data: {
          application_id: stage.applicationId,
          from_stage: stage.fromStage ?? undefined,
          to_stage: stage.toStage,
          changed_by: stage.changedBy,
          remarks: stage.remarks,
        },
      })
    );
  }

  await findOrCreate(
    await prisma.recruiterFeedback.findFirst({
      where: { application_id: rahulApplication.id, decision: 'shortlist' },
    }),
    () => prisma.recruiterFeedback.create({
      data: {
        application_id: rahulApplication.id,
        recruiter_id: recruiterProfile!.id,
        decision: 'shortlist',
        remarks: 'Strong full-stack fundamentals and good project clarity.',
      },
    })
  );

  await findOrCreate(
    await prisma.recruiterFeedback.findFirst({
      where: { application_id: aditiApplication.id, decision: 'shortlist' },
    }),
    () => prisma.recruiterFeedback.create({
      data: {
        application_id: aditiApplication.id,
        recruiter_id: recruiterProfile!.id,
        decision: 'shortlist',
        remarks: 'Excellent analytics portfolio and communication skills.',
      },
    })
  );

  const rahulOffer = await findOrCreate(
    await prisma.offer.findFirst({
      where: {
        tenant_id: tenant.id,
        student_id: student.id,
        posting_id: techcorpPosting.id,
      },
    }),
    () => prisma.offer.create({
      data: {
        tenant_id: tenant.id,
        student_id: student.id,
        posting_id: techcorpPosting.id,
        company_id: techcorpCompanyId,
        type: 'job',
        role: 'Software Engineer',
        ctc: '8.4 LPA',
        location: 'Ahmedabad',
        offer_date: new Date('2026-04-01'),
        status: 'pending_student_action',
        joining_status: 'pending',
        is_locked: false,
        compliance_status: 'compliant',
        applications_blocked: true,
        created_by: users.tpo_admin,
      },
    })
  );

  const aditiOffer = await findOrCreate(
    await prisma.offer.findFirst({
      where: {
        tenant_id: tenant.id,
        student_id: studentAlt.id,
        posting_id: innovatesoftPosting.id,
      },
    }),
    () => prisma.offer.create({
      data: {
        tenant_id: tenant.id,
        student_id: studentAlt.id,
        posting_id: innovatesoftPosting.id,
        company_id: innovatesoftCompanyId,
        type: 'internship',
        role: 'Data Analyst Intern',
        stipend: '25000/month',
        location: 'Remote',
        offer_date: new Date('2026-04-01'),
        status: 'accepted',
        accepted_at: new Date('2026-04-02'),
        joining_status: 'joined',
        joining_date: new Date('2026-04-01'),
        is_locked: true,
        compliance_status: 'compliant',
        applications_blocked: true,
        created_by: users.tpo_admin,
      },
    })
  );

  await findOrCreate(
    await prisma.offerAudit.findFirst({
      where: { offer_id: rahulOffer.id, action: 'created' },
    }),
    () => prisma.offerAudit.create({
      data: {
        offer_id: rahulOffer.id,
        action: 'created',
        performed_by: users.tpo_admin,
        details: 'Created placement offer for Rahul Sharma',
      },
    })
  );

  await findOrCreate(
    await prisma.offerAudit.findFirst({
      where: { offer_id: aditiOffer.id, action: 'created' },
    }),
    () => prisma.offerAudit.create({
      data: {
        offer_id: aditiOffer.id,
        action: 'created',
        performed_by: users.tpo_admin,
        details: 'Created internship offer for Aditi Mehta',
      },
    })
  );

  await findOrCreate(
    await prisma.offerAudit.findFirst({
      where: { offer_id: aditiOffer.id, action: 'accepted' },
    }),
    () => prisma.offerAudit.create({
      data: {
        offer_id: aditiOffer.id,
        action: 'accepted',
        performed_by: users.student_alt,
        details: 'Student accepted the internship offer',
      },
    })
  );

  const techcorpEvent = await findOrCreate(
    await prisma.event.findFirst({
      where: {
        tenant_id: tenant.id,
        company_id: techcorpCompanyId,
        title: 'TechCorp Campus Drive 2026',
      },
    }),
    () => prisma.event.create({
      data: {
        tenant_id: tenant.id,
        company_id: techcorpCompanyId,
        posting_id: techcorpPosting.id,
        title: 'TechCorp Campus Drive 2026',
        type: 'campus_drive',
        status: 'completed',
        date: new Date('2026-03-28'),
        start_time: '09:30',
        end_time: '15:30',
        venue: 'Main Auditorium',
        reporting_time: '09:00',
        dress_code: 'Business Formals',
        instructions: 'Carry resume, ID card, and updated documents.',
        documents_required: ['resume', 'id_card'],
        faculty_coordinators: ['Prof. Amit Desai'],
        created_by: users.tpo_admin,
      },
    })
  );

  const innovatesoftEvent = await findOrCreate(
    await prisma.event.findFirst({
      where: {
        tenant_id: tenant.id,
        company_id: innovatesoftCompanyId,
        title: 'InnovateSoft Internship Orientation 2026',
      },
    }),
    () => prisma.event.create({
      data: {
        tenant_id: tenant.id,
        company_id: innovatesoftCompanyId,
        posting_id: innovatesoftPosting.id,
        title: 'InnovateSoft Internship Orientation 2026',
        type: 'workshop',
        status: 'completed',
        date: new Date('2026-04-01'),
        start_time: '10:30',
        end_time: '12:00',
        venue: 'Conference Room 2',
        reporting_time: '10:00',
        dress_code: 'Smart Casual',
        instructions: 'Join the remote onboarding and mentoring session.',
        documents_required: ['resume'],
        faculty_coordinators: ['Prof. Amit Desai'],
        created_by: users.tpo_employee,
      },
    })
  );

  const techcorpPanel = await findOrCreate(
    await prisma.eventPanel.findFirst({
      where: { event_id: techcorpEvent.id, panel_name: 'Technical Round' },
    }),
    () => prisma.eventPanel.create({
      data: {
        event_id: techcorpEvent.id,
        panel_name: 'Technical Round',
        room: 'Lab 401',
        start_time: '11:00',
        end_time: '13:00',
        recruiters: ['Sarah Johnson'],
      },
    })
  );

  const innovatesoftPanel = await findOrCreate(
    await prisma.eventPanel.findFirst({
      where: { event_id: innovatesoftEvent.id, panel_name: 'Orientation Panel' },
    }),
    () => prisma.eventPanel.create({
      data: {
        event_id: innovatesoftEvent.id,
        panel_name: 'Orientation Panel',
        room: 'Room 202',
        start_time: '10:30',
        end_time: '12:00',
        recruiters: ['InnovateSoft HR'],
      },
    })
  );

  await prisma.eventStudent.upsert({
    where: { event_id_student_id: { event_id: techcorpEvent.id, student_id: student.id } },
    update: {
      panel_id: techcorpPanel.id,
      slot_time: '11:15',
      attendance: 'present',
      marked_by: users.tpo_employee,
      marked_at: new Date('2026-03-28'),
    },
    create: {
      event_id: techcorpEvent.id,
      student_id: student.id,
      panel_id: techcorpPanel.id,
      slot_time: '11:15',
      attendance: 'present',
      marked_by: users.tpo_employee,
      marked_at: new Date('2026-03-28'),
    },
  });

  await prisma.eventStudent.upsert({
    where: { event_id_student_id: { event_id: innovatesoftEvent.id, student_id: studentAlt.id } },
    update: {
      panel_id: innovatesoftPanel.id,
      slot_time: '10:45',
      attendance: 'late',
      marked_by: users.tpo_admin,
      marked_at: new Date('2026-04-01'),
    },
    create: {
      event_id: innovatesoftEvent.id,
      student_id: studentAlt.id,
      panel_id: innovatesoftPanel.id,
      slot_time: '10:45',
      attendance: 'late',
      marked_by: users.tpo_admin,
      marked_at: new Date('2026-04-01'),
    },
  });

  const rahulNoc = await findOrCreate(
    await prisma.nocRequest.findFirst({
      where: {
        tenant_id: tenant.id,
        student_id: student.id,
        company_name: 'TechCorp Solutions',
        role_title: 'Software Engineer Intern',
      },
    }),
    () => prisma.nocRequest.create({
      data: {
        tenant_id: tenant.id,
        student_id: student.id,
        noc_type: 'internship',
        program: 'summer_internship',
        placement_source: 'university_drive',
        drive_id: 'TD-2026-01',
        company_name: 'TechCorp Solutions',
        company_address: 'Ahmedabad, Gujarat, India',
        company_city: 'Ahmedabad',
        company_state: 'Gujarat',
        company_pincode: '380015',
        company_verification_status: 'verified',
        contact_person_name: 'Sarah Johnson',
        contact_person_designation: 'HR Manager',
        contact_person_phone: '+1-555-0100',
        contact_person_email: 'recruiter@techcorp.com',
        reference_by: 'TPO Office',
        reference_details: 'University drive internship request',
        role_title: 'Software Engineer Intern',
        technology_domain: 'Full Stack Development',
        job_description: 'Build internal tools and student-facing dashboards.',
        stipend_amount: 25000,
        start_date: new Date('2026-05-15'),
        end_date: new Date('2026-07-15'),
        duration_weeks: 9,
        offer_letter_url: '/uploads/noc/rahul-techcorp-offer.pdf',
        status: 'pending_faculty',
      },
    })
  );

  const aditiNoc = await findOrCreate(
    await prisma.nocRequest.findFirst({
      where: {
        tenant_id: tenant.id,
        student_id: studentAlt.id,
        company_name: 'CloudNine Services',
        role_title: 'Cloud Support Associate',
      },
    }),
    () => prisma.nocRequest.create({
      data: {
        tenant_id: tenant.id,
        student_id: studentAlt.id,
        noc_type: 'training',
        program: 'industrial_training',
        placement_source: 'self_sourced',
        company_name: 'CloudNine Services',
        company_address: 'Bengaluru, Karnataka, India',
        company_city: 'Bengaluru',
        company_state: 'Karnataka',
        company_pincode: '560001',
        company_verification_status: 'verified',
        contact_person_name: 'Maya Singh',
        contact_person_designation: 'Talent Partner',
        contact_person_phone: '+91-9876540000',
        contact_person_email: 'hr@cloudnine.example.com',
        reference_by: 'Self',
        reference_details: 'Student sourced industrial training request',
        role_title: 'Cloud Support Associate',
        technology_domain: 'Cloud Operations',
        job_description: 'Support monitoring, deployments, and ticket triage.',
        stipend_amount: 15000,
        start_date: new Date('2026-04-10'),
        end_date: new Date('2026-06-30'),
        duration_weeks: 12,
        offer_letter_url: '/uploads/noc/aditi-cloudnine-offer.pdf',
        status: 'issued',
        faculty_approved_by: users.faculty_coordinator,
        faculty_approved_at: new Date('2026-03-28'),
        faculty_remarks: 'Approved for industrial training',
        tpo_approved_by: users.tpo_admin,
        tpo_approved_at: new Date('2026-03-29'),
        tpo_remarks: 'Approved and issued',
        noc_number: 'NOC-2026-00001',
        issued_at: new Date('2026-03-30'),
        certificate_url: '/uploads/noc/NOC-2026-00001.pdf',
      },
    })
  );

  const aditiInternship = await findOrCreate(
    await prisma.internship.findFirst({
      where: {
        tenant_id: tenant.id,
        student_id: studentAlt.id,
        company_name: 'InnovateSoft Pvt Ltd',
        role: 'Data Analyst Intern',
      },
    }),
    () => prisma.internship.create({
      data: {
        tenant_id: tenant.id,
        student_id: studentAlt.id,
        company_id: innovatesoftCompanyId,
        company_name: 'InnovateSoft Pvt Ltd',
        role: 'Data Analyst Intern',
        department: 'Information Technology',
        internship_type: 'stipend_based',
        status: 'ongoing',
        start_date: new Date('2026-04-01'),
        end_date: new Date('2026-06-30'),
        stipend_amount: 25000,
        stipend_frequency: 'monthly',
        is_receiving_stipend: true,
        certificate_uploaded: false,
        offer_id: aditiOffer.id,
      },
    })
  );

  await findOrCreate(
    await prisma.internshipIssue.findFirst({
      where: {
        internship_id: aditiInternship.id,
        title: 'Access to analytics workspace pending',
      },
    }),
    () => prisma.internshipIssue.create({
      data: {
        internship_id: aditiInternship.id,
        title: 'Access to analytics workspace pending',
        description: 'Mentor account and BI workspace access are still pending from the company.',
        status: 'open',
        reported_by: users.student_alt,
      },
    })
  );

  await findOrCreate(
    await prisma.internshipShowcase.findFirst({
      where: {
        portfolio_id: aditiPortfolio.id,
        company_name: 'InnovateSoft Pvt Ltd',
        role: 'Data Analyst Intern',
      },
    }),
    () => prisma.internshipShowcase.create({
      data: {
        portfolio_id: aditiPortfolio.id,
        company_name: 'InnovateSoft Pvt Ltd',
        role: 'Data Analyst Intern',
        duration_months: 3,
        start_date: new Date('2026-04-01'),
        end_date: new Date('2026-06-30'),
        key_outcomes: ['Built weekly KPI dashboard', 'Automated CSV reporting'],
        proof_url: '/uploads/internships/aditi-mehta-proof.pdf',
        is_verified: true,
        linked_internship_id: aditiInternship.id,
      },
    })
  );

  const rahulNoDues = await findOrCreate(
    await prisma.noDuesRequest.findFirst({
      where: {
        tenant_id: tenant.id,
        student_id: student.id,
        exit_reason: 'higher_studies',
      },
    }),
    () => prisma.noDuesRequest.create({
      data: {
        tenant_id: tenant.id,
        student_id: student.id,
        exit_reason: 'higher_studies',
        institution_name: 'Indian Institute of Technology',
        program_name: 'M.Tech Computer Science',
        country: 'India',
        declaration_accepted: true,
        status: 'pending_review',
      },
    })
  );

  const techcorpAnnouncement = await findOrCreate(
    await prisma.announcement.findFirst({
      where: {
        tenant_id: tenant.id,
        title: 'TechCorp Software Engineer Drive',
      },
    }),
    () => prisma.announcement.create({
      data: {
        tenant_id: tenant.id,
        title: 'TechCorp Software Engineer Drive',
        content: 'Campus drive circular and eligibility details for the Software Engineer role.',
        priority: 'high',
        status: 'published',
        target_audience_type: 'eligible_for_posting',
        target_posting_id: techcorpPosting.id,
        requires_consent: false,
        linked_circular_id: techcorpCircular.id,
        total_recipients: 1,
        read_count: 1,
        consent_count: 0,
        created_by: users.tpo_admin,
        published_at: new Date('2026-03-24'),
      },
    })
  );

  const innovatesoftAnnouncement = await findOrCreate(
    await prisma.announcement.findFirst({
      where: {
        tenant_id: tenant.id,
        title: 'InnovateSoft Internship Cohort',
      },
    }),
    () => prisma.announcement.create({
      data: {
        tenant_id: tenant.id,
        title: 'InnovateSoft Internship Cohort',
        content: 'Internship orientation circular for the Data Analyst internship cohort.',
        priority: 'medium',
        status: 'published',
        target_audience_type: 'eligible_for_posting',
        target_posting_id: innovatesoftPosting.id,
        requires_consent: false,
        linked_circular_id: innovatesoftCircular.id,
        total_recipients: 1,
        read_count: 0,
        consent_count: 0,
        created_by: users.tpo_employee,
        published_at: new Date('2026-03-31'),
      },
    })
  );

  await prisma.announcementReceipt.upsert({
    where: {
      announcement_id_student_id: {
        announcement_id: techcorpAnnouncement.id,
        student_id: student.id,
      },
    },
    update: {
      is_read: true,
      read_at: new Date('2026-03-24'),
      has_consented: false,
    },
    create: {
      announcement_id: techcorpAnnouncement.id,
      student_id: student.id,
      is_read: true,
      read_at: new Date('2026-03-24'),
      has_consented: false,
    },
  });

  await prisma.announcementReceipt.upsert({
    where: {
      announcement_id_student_id: {
        announcement_id: innovatesoftAnnouncement.id,
        student_id: studentAlt.id,
      },
    },
    update: {
      is_read: false,
      has_consented: false,
    },
    create: {
      announcement_id: innovatesoftAnnouncement.id,
      student_id: studentAlt.id,
      is_read: false,
      has_consented: false,
    },
  });

  // Summary
  console.log('\n--- Seed Complete ---');
  console.log(`Tenant: 1`);
  console.log(`Users: ${usersData.length} (includes 2 student accounts)`);
  console.log('Student profiles: 2');
  console.log(`Companies: ${companiesData.length}`);
  console.log(`Recruiters: 1`);
  console.log(`Role permissions: ${permCount}`);
  console.log(`Policies: 1`);
  console.log(`Eligibility rules: 1`);
  console.log('Resumes: 2');
  console.log('Portfolios: 2');
  console.log('Student projects: 3');
  console.log('Certifications: 2');
  console.log('Company engagements: 2');
  console.log('Circular templates: 2');
  console.log('Generated circulars: 2');
  console.log('Postings: 2');
  console.log('Applications: 2');
  console.log('Offers: 2');
  console.log('Events: 2');
  console.log('NOC requests: 2');
  console.log('Internships: 1');
  console.log('Announcements: 2');
  console.log('No dues requests: 1');
  console.log(`\nDefault password for all users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
