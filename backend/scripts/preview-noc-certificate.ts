/**
 * Renders a SAMPLE NOC certificate PDF straight from the renderer (no DB, no issuance) so the
 * formatting fixes can be eyeballed. Output: backend/sample-noc.pdf
 *
 * Run from the backend/ folder:  npx tsx scripts/preview-noc-certificate.ts
 * Then open backend/sample-noc.pdf
 *
 * The sample body deliberately contains a BLANK LINE (<p><br></p>) between two paragraphs to verify
 * that editor blank lines now render as vertical space in the issued PDF.
 */
import fs from 'fs';
import path from 'path';
import { generateNocCertificatePdf, type NocCertificateContext } from '../src/modules/noc/noc-certificate.renderer';

async function main() {
  const context: NocCertificateContext = {
    referenceNumber: 'SOU/TPO/08-2026/INT/0042',
    issueDate: new Date('2026-08-26'),
    contactPersonName: 'Ms. Priya Sharma',
    contactPersonDesignation: 'HR Manager',
    subject: 'No Objection Certificate for Internship',
    // Two paragraphs separated by a blank line — the blank line must show in the PDF now.
    bodyHtml:
      '<p>This is to certify that the student named below is a bona fide student of Silver Oak University and the University has <b>no objection</b> to the student undertaking the internship detailed below.</p>' +
      '<p><br></p>' +
      '<p>We wish the student the very best for this opportunity and request your team to extend the necessary support during the internship period.</p>',
    programLabel: 'Internship',
    student: {
      full_name: 'Aarav Mehta',
      enrollment_number: '2103031050042',
      department: 'Computer Engineering',
      batch: '2021-2025',
      current_semester: '7',
      course: 'B.Tech Computer Engineering',
      institute: 'Silver Oak College of Engineering & Technology',
    },
    noc: {
      company_name: 'TechCorp Solutions Pvt. Ltd.',
      company_address: '4th Floor, Titanium City Center, Anandnagar Road',
      company_city: 'Ahmedabad',
      company_state: 'Gujarat',
      company_pincode: '380015',
      role_title: 'Software Engineering Intern',
      start_date: new Date('2026-09-01'),
      end_date: new Date('2027-02-28'),
    },
  };

  const pdf = await generateNocCertificatePdf(context);
  const outPath = path.resolve(process.cwd(), 'sample-noc.pdf');
  fs.writeFileSync(outPath, pdf);
  console.log(`Sample NOC written to: ${outPath} (${pdf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
