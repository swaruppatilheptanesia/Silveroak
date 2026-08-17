import { prisma } from '../src/config/database';
import { Prisma } from '@prisma/client';
import {
  buildDefaultNocTemplateBodyHtml,
  formatNocPostingTypeLabel,
  getTemplateForProgram,
} from '../src/modules/noc-templates/noc-template.service';

function formatCertificateDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

async function main() {
  const issuedNocs = await prisma.nocRequest.findMany({
    where: {
      status: 'issued',
      certificate_snapshot: {
        equals: Prisma.DbNull,
      },
    },
    include: {
      student: {
        select: {
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          current_semester: true,
          course: true,
          institute: true,
        },
      },
    },
    orderBy: {
      updated_at: 'desc',
    },
  });

  let updatedCount = 0;

  for (const noc of issuedNocs) {
    const templateResult = await getTemplateForProgram(noc.tenant_id, noc.program);
    const programLabel = templateResult?.postingType.value
      ? formatNocPostingTypeLabel(templateResult.postingType.value)
      : formatNocPostingTypeLabel(noc.program);
    const template = templateResult?.template ?? {
      id: null,
      name: `NOC Template - ${programLabel}`,
      subject: `${programLabel} Program`,
      body_html: buildDefaultNocTemplateBodyHtml(programLabel),
    };

    const values = {
      reference_number: noc.noc_number ?? '',
      date: formatCertificateDate(noc.issued_at ?? noc.updated_at),
      contact_person_name: noc.contact_person_name || '—',
      student_name: noc.student.full_name,
      enrollment_number: noc.student.enrollment_number,
      branch: noc.student.department,
      semester: noc.student.current_semester ? String(noc.student.current_semester) : '—',
      program_label: programLabel,
      company_name: noc.company_name,
      duration_from: formatCertificateDate(noc.start_date),
      duration_to: formatCertificateDate(noc.end_date),
      ...(noc.contact_person_designation ? { contact_person_designation: noc.contact_person_designation } : {}),
      ...(noc.student.batch ? { batch: noc.student.batch } : {}),
      ...(noc.student.course ? { course: noc.student.course } : {}),
      ...(noc.student.institute ? { institute: noc.student.institute } : {}),
      ...(noc.company_address ? { company_address: noc.company_address } : {}),
      ...(noc.company_city ? { company_city: noc.company_city } : {}),
      ...(noc.company_state ? { company_state: noc.company_state } : {}),
      ...(noc.company_pincode ? { company_pincode: noc.company_pincode } : {}),
      ...(noc.role_title ? { role_title: noc.role_title } : {}),
    };

    await prisma.nocRequest.update({
      where: { id: noc.id },
      data: {
        certificate_snapshot: {
          template_id: template.id,
          template_name: template.name,
          posting_type_value: templateResult?.postingType.value ?? noc.program,
          subject: template.subject,
          body_html: template.body_html,
          values,
          generated_at: (noc.issued_at ?? noc.updated_at).toISOString(),
        },
      },
    });

    updatedCount += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Backfilled ${updatedCount} NOC certificate snapshot(s).`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
