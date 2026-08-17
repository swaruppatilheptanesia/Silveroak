import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMasterValues } from '@/hooks/use-master-api';
import { useInternshipNocListingReport } from '@/hooks/use-report-analytics-api';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { formatDate } from '@/lib/formatters';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));
const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((row) => row[key]).filter((value) => value && value !== '—'))).sort();

function LinkCell({ url }: { url: string | null }) {
  const resolved = url ? resolveBackendAssetUrl(url) : '';
  if (!resolved) return <span className="text-muted-foreground">—</span>;
  return <a href={resolved} target="_blank" rel="noreferrer" className="text-primary underline">Open</a>;
}

export default function InternshipNocListingReport() {
  const [postingTypes, setPostingTypes] = useState<string[]>([]);
  const [institute, setInstitute] = useState('all');
  const [course, setCourse] = useState('all');
  const [branch, setBranch] = useState('all');
  const [semester, setSemester] = useState('all');
  const [academicYear, setAcademicYear] = useState('all');

  const academicYearQuery = useMasterValues('academic_year');

  const queryParams = useMemo(() => ({
    posting_type: postingTypes.length > 0 ? postingTypes : undefined,
    institute: institute === 'all' ? undefined : institute,
    course: course === 'all' ? undefined : course,
    branch: branch === 'all' ? undefined : branch,
    semester: semester === 'all' ? undefined : semester,
    academic_year: academicYear === 'all' ? undefined : academicYear,
  }), [academicYear, branch, course, institute, postingTypes, semester]);

  const { data, isLoading } = useInternshipNocListingReport(queryParams);
  const records: any[] = data?.records ?? [];

  const headers = [
    'NOC Number', 'Posting Type', 'Enrollment No', 'Student Name', 'Institute', 'Course', 'Branch', 'Semester', 'Contact',
    'Email', 'Company', 'Role', 'Stipend', 'Start Date', 'End Date', 'Internship Type', 'NOC Certificate', 'Offer Letter',
    'Completion Certificate', 'Recruiter Name', 'Recruiter Contact', 'Recruiter Email', 'Recruiter Designation',
    'Student Photo', 'Internship+Placement', 'NOC Issued Date', 'NOC Status',
  ];
  const exportRows = records.map((row) => [
    row.noc_number, row.posting_type, row.enrollment_number, row.student_name, row.institute, row.course, row.branch,
    row.semester, row.contact, row.email, row.company_name, row.role_title, row.stipend, formatDate(row.start_date),
    row.end_date ? formatDate(row.end_date) : 'Ongoing', row.internship_type,
    row.noc_certificate_url ? resolveBackendAssetUrl(row.noc_certificate_url) : '—',
    row.offer_letter_url ? resolveBackendAssetUrl(row.offer_letter_url) : '—',
    row.completion_certificate_url ? resolveBackendAssetUrl(row.completion_certificate_url) : '—',
    row.recruiter_name, row.recruiter_contact, row.recruiter_email, row.recruiter_designation,
    row.student_photo_url ? resolveBackendAssetUrl(row.student_photo_url) : '—',
    row.internship_placement_status, row.noc_issued_date ? formatDate(row.noc_issued_date) : '—', row.noc_status,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="Internship / NOC — Listing & Export" subtitle="NOC-level internship records." totalRecords={records.length} headers={headers} rows={exportRows} filename="internship_noc_listing" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <ReportScopeFilters
            postingTypes={{ values: postingTypes, onChange: setPostingTypes }}
            institute={{ value: institute, onChange: setInstitute, options: uniq(records, 'institute'), label: 'Institutes' }}
            course={{ value: course, onChange: setCourse, options: uniq(records, 'course'), label: 'Courses' }}
            branch={{ value: branch, onChange: setBranch, options: uniq(records, 'branch'), label: 'Branches' }}
            semester={{ value: semester, onChange: setSemester, options: uniq(records, 'semester'), label: 'Semesters' }}
            academicYear={{ value: academicYear, onChange: setAcademicYear, options: academicYearQuery.data ?? [], label: 'Academic Years' }}
          />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (<TableHead key={header} className="whitespace-nowrap">{header}</TableHead>))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && records.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading NOC records...</TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No records for the selected filters.</TableCell></TableRow>
                ) : (
                  records.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap font-medium">{fmt(row.noc_number)}</TableCell>
                      <TableCell className="capitalize whitespace-nowrap">{fmt(row.posting_type)}</TableCell>
                      <TableCell>{fmt(row.enrollment_number)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{fmt(row.student_name)}</TableCell>
                      <TableCell>{fmt(row.institute)}</TableCell>
                      <TableCell>{fmt(row.course)}</TableCell>
                      <TableCell>{fmt(row.branch)}</TableCell>
                      <TableCell className="text-center">{fmt(row.semester)}</TableCell>
                      <TableCell>{fmt(row.contact)}</TableCell>
                      <TableCell>{fmt(row.email)}</TableCell>
                      <TableCell>{fmt(row.company_name)}</TableCell>
                      <TableCell>{fmt(row.role_title)}</TableCell>
                      <TableCell className="text-center">{fmt(row.stipend)}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.start_date ? formatDate(row.start_date) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.end_date ? formatDate(row.end_date) : 'Ongoing'}</TableCell>
                      <TableCell className="capitalize whitespace-nowrap">{fmt(row.internship_type)}</TableCell>
                      <TableCell><LinkCell url={row.noc_certificate_url} /></TableCell>
                      <TableCell><LinkCell url={row.offer_letter_url} /></TableCell>
                      <TableCell><LinkCell url={row.completion_certificate_url} /></TableCell>
                      <TableCell>{fmt(row.recruiter_name)}</TableCell>
                      <TableCell>{fmt(row.recruiter_contact)}</TableCell>
                      <TableCell>{fmt(row.recruiter_email)}</TableCell>
                      <TableCell>{fmt(row.recruiter_designation)}</TableCell>
                      <TableCell><LinkCell url={row.student_photo_url} /></TableCell>
                      <TableCell className="text-center">{fmt(row.internship_placement_status)}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.noc_issued_date ? formatDate(row.noc_issued_date) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(row.noc_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
