import { cn } from '@/lib/utils';
import { resolveNocTemplateHtml } from '@/lib/nocTemplateModule';
import type { NocTemplatePreviewValues } from '@/types/nocTemplate';

import logoNoc from '@/assets/LOGO_NOC.png';
import nocWatermark from '@/assets/noc_png.png';
import stampNoc from '@/assets/stamp.png';

const NOC_SIGNATURE_STAMP_SOURCE_WIDTH = 3375;
const NOC_SIGNATURE_STAMP_SOURCE_HEIGHT = 4219;
// The stamp source has a large transparent canvas, so crop to the visible seal area.
const NOC_SIGNATURE_STAMP_CROP = {
  left: 400,
  top: 1702,
  width: 2830,
  height: 1583,
};
const NOC_SIGNATURE_STAMP_WIDTH = 70;
const NOC_SIGNATURE_STAMP_HEIGHT = Math.round(
  (NOC_SIGNATURE_STAMP_WIDTH * NOC_SIGNATURE_STAMP_CROP.height) / NOC_SIGNATURE_STAMP_CROP.width
);
const NOC_SIGNATURE_STAMP_SCALE = NOC_SIGNATURE_STAMP_WIDTH / NOC_SIGNATURE_STAMP_CROP.width;
const NOC_SIGNATURE_STAMP_IMAGE_WIDTH = NOC_SIGNATURE_STAMP_SOURCE_WIDTH * NOC_SIGNATURE_STAMP_SCALE;
const NOC_SIGNATURE_STAMP_IMAGE_HEIGHT = NOC_SIGNATURE_STAMP_SOURCE_HEIGHT * NOC_SIGNATURE_STAMP_SCALE;
const NOC_SIGNATURE_STAMP_OFFSET_X = -NOC_SIGNATURE_STAMP_CROP.left * NOC_SIGNATURE_STAMP_SCALE;
const NOC_SIGNATURE_STAMP_OFFSET_Y = -NOC_SIGNATURE_STAMP_CROP.top * NOC_SIGNATURE_STAMP_SCALE;

/**
 * A recipient line is shown only when it carries real content. `'—'` counts as empty: certificate
 * snapshots stored that em dash for a missing contact person (`buildNocCertificateSnapshot`), so
 * already-issued NOCs would otherwise render a stray dash line.
 */
function hasValue(value: string | undefined | null) {
  const trimmed = value?.trim();
  return Boolean(trimmed) && trimmed !== '—' && trimmed !== '-';
}

function renderLine(label: string, value: string, className?: string) {
  return (
    <div className={cn('text-sm leading-relaxed text-foreground', className)}>
      <span className="font-medium">{label}</span> {value}
    </div>
  );
}

export function NocTemplatePreview({
  subject,
  bodyHtml,
  values,
  className,
}: {
  subject: string;
  bodyHtml: string;
  values: NocTemplatePreviewValues;
  className?: string;
}) {
  const resolvedBodyHtml = resolveNocTemplateHtml(bodyHtml, {
    reference_number: values.reference_number,
    reference_no: values.reference_number,
    date: values.date,
    issue_date: values.date,
    contact_person_name: values.contact_person_name,
    contact_person_designation: values.contact_person_designation ?? '',
    student_name: values.student_name,
    enrollment_number: values.enrollment_number,
    branch: values.branch,
    semester: values.semester,
    batch: values.batch ?? '',
    course: values.course ?? '',
    institute: values.institute ?? '',
    program_label: values.program_label,
    company_name: values.company_name,
    company_address: values.company_address ?? '',
    company_city: values.company_city ?? '',
    company_state: values.company_state ?? '',
    company_pincode: values.company_pincode ?? '',
    role_title: values.role_title ?? '',
    start_date: values.duration_from,
    end_date: values.duration_to,
  });

  return (
    <div className={cn('w-full', className)}>
      <div className="mx-auto w-full max-w-[860px] rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="overflow-hidden rounded-xl bg-[#f8f8f2] shadow-inner">
          <div className="relative mx-auto aspect-[210/297] w-full max-w-[794px] bg-white px-10 py-8 text-[11px] text-black">
            <img
              src={nocWatermark}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[44%] z-0 w-[230px] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
            />

            <div className="relative z-10 flex flex-col">
              <div className="flex justify-center">
                <img
                  src={logoNoc}
                  alt="Silver Oak University"
                  className="h-auto w-[320px] object-contain"
                />
              </div>

              <div className="mt-8 flex items-start justify-between text-[10.5px]">
                <div>Ref No.: {values.reference_number}</div>
                <div>Date: {values.date}</div>
              </div>

              <div className="mt-8 text-center text-[15px] font-bold tracking-wide underline">
                NO OBJECTION CERTIFICATE
              </div>

              <div className="mt-6 pl-2 text-[11px]">
                {/* Mirrors the PDF recipient block (noc-certificate.renderer.ts): fixed
                    "H.R. Manager / Training Team" + company name. Keep the two in sync. */}
                <div className="font-medium">To,</div>
                <div className="mt-1">H.R. Manager / Training Team</div>
                {hasValue(values.company_name) ? (
                  <div className="mt-0.5">{values.company_name}</div>
                ) : null}
                <div className="mt-2 h-px w-[140px] bg-foreground/70" />
              </div>

              <div className="mt-8 text-center text-[12px] font-semibold">
                Sub: {subject}
              </div>

              <div
                className="mt-6 pl-2 pr-1 text-[11px] leading-[1.45] text-black text-justify [text-align:justify] prose prose-sm max-w-none prose-p:my-0 prose-p:text-[11px] prose-p:text-justify prose-headings:my-0 prose-li:my-0 prose-strong:text-black prose-em:text-black prose-a:text-black prose-p:text-black prose-headings:text-black prose-li:text-black prose-code:text-black prose-pre:text-black [--tw-prose-body:#000000] [--tw-prose-headings:#000000] [--tw-prose-lead:#000000] [--tw-prose-links:#000000] [--tw-prose-bold:#000000] [--tw-prose-counters:#000000] [--tw-prose-bullets:#000000] [--tw-prose-hr:#000000] [--tw-prose-quotes:#000000] [--tw-prose-quote-borders:#000000] [--tw-prose-captions:#000000] [--tw-prose-code:#000000] [--tw-prose-pre-code:#000000] [--tw-prose-th-borders:#000000] [--tw-prose-td-borders:#000000]"
                dangerouslySetInnerHTML={{ __html: resolvedBodyHtml }}
              />

              {/* Student details as labeled rows. Mirrors the PDF renderer (noc-certificate.renderer.ts). */}
              <div className="mt-6 pl-2 text-[11px] leading-relaxed">
                {[
                  { label: 'Enrollment No.', value: values.enrollment_number },
                  { label: 'Student Name', value: values.student_name },
                  { label: 'Institute Name', value: hasValue(values.institute) ? values.institute! : '—' },
                  { label: 'Course', value: hasValue(values.course) ? values.course! : '—' },
                  { label: 'Branch', value: values.branch },
                  { label: 'Semester', value: values.semester },
                  { label: 'Duration', value: `${values.duration_from} to ${values.duration_to}` },
                ].map((field) => (
                  <div key={field.label} className="flex gap-1">
                    <span className="w-[120px] shrink-0 font-medium">{field.label}</span>
                    <span>: {field.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pl-2 text-[11px] leading-relaxed">
                <div>With Regards,</div>
                <div className="relative mt-1 h-[84px] w-[180px] overflow-visible">
                  <div className="relative h-[39px] w-[70px] overflow-hidden">
                    <img
                      src={stampNoc}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                      style={{
                        width: `${NOC_SIGNATURE_STAMP_IMAGE_WIDTH}px`,
                        height: `${NOC_SIGNATURE_STAMP_IMAGE_HEIGHT}px`,
                        transform: `translate(${NOC_SIGNATURE_STAMP_OFFSET_X}px, ${NOC_SIGNATURE_STAMP_OFFSET_Y}px)`,
                      }}
                    />
                  </div>
                  <div className="absolute left-0 top-[52px] font-semibold">Dr. Nipen Shukla</div>
                </div>
                <div>Director - Training & Placement Cell</div>

                <div>Email: internship@silveroakuni.ac.in</div>
              </div>

              <div className="mt-8 text-center leading-tight">
                <div className="text-[10px] font-semibold text-[#6a3420]">
                  Established under The Gujarat Private Universities Act 2009
                </div>
                <div className="mt-1 border-t border-foreground/70 pt-2 text-[7px] tracking-tight">
                  Nr. Bhavik Publications, Opp. Bhagwat Vidhyapith, S.G. Road, Gota, Ahmedabad - 382481
                </div>
                <div className="mt-0.5 text-[7px] tracking-tight">
                  Phone : +91-79-66046300 | E-Mail : info@silveroakuni.ac.in | Web : www.silveroakuni.ac.in
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {subject.trim() ? null : (
        <p className="mt-3 text-xs text-muted-foreground">
          Add a subject and body to see the live certificate preview.
        </p>
      )}
    </div>
  );
}
