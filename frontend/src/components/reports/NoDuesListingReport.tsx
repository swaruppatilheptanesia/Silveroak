import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNoDuesListingReport } from '@/hooks/use-report-analytics-api';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { formatDate } from '@/lib/formatters';
import { EXIT_REASON_LABELS, type NoDuesExitReason } from '@/types/noDues';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));
const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((row) => row[key]).filter((value) => value && value !== '—'))).sort();
const reasonLabel = (value: string) => EXIT_REASON_LABELS[value as NoDuesExitReason] ?? value;

function LinkCell({ url }: { url: string | null }) {
  const resolved = url ? resolveBackendAssetUrl(url) : '';
  if (!resolved) return <span className="text-muted-foreground">—</span>;
  return <a href={resolved} target="_blank" rel="noreferrer" className="text-primary underline">Open</a>;
}

export default function NoDuesListingReport() {
  const [passingYear, setPassingYear] = useState('all');
  const [institute, setInstitute] = useState('all');
  const [course, setCourse] = useState('all');
  const [branch, setBranch] = useState('all');
  const [semester, setSemester] = useState('all');

  const queryParams = useMemo(() => ({
    academic_year: passingYear === 'all' ? undefined : passingYear,
    institute: institute === 'all' ? undefined : institute,
    course: course === 'all' ? undefined : course,
    branch: branch === 'all' ? undefined : branch,
    semester: semester === 'all' ? undefined : semester,
  }), [branch, course, institute, passingYear, semester]);

  const { data, isLoading } = useNoDuesListingReport(queryParams);
  const records: any[] = data?.records ?? [];

  const headers = [
    'Passing Year', 'Enrollment No', 'Student Name', 'Institute', 'Course', 'Branch', 'Semester', 'Contact', 'Email',
    'No-Due Type', 'Uploaded Document', 'Student Photo', 'Admission Year', 'Batch', 'No-Due Date',
  ];
  const exportRows = records.map((row) => [
    row.passing_year, row.enrollment_number, row.student_name, row.institute, row.course, row.branch, row.semester,
    row.contact, row.email, reasonLabel(row.exit_reason),
    row.proof_url ? resolveBackendAssetUrl(row.proof_url) : '—',
    row.student_photo_url ? resolveBackendAssetUrl(row.student_photo_url) : '—',
    row.admission_year, row.batch, row.no_due_date ? formatDate(row.no_due_date) : '—',
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="No-Due — Listing & Export" subtitle="Student-level No-Due records." totalRecords={records.length} headers={headers} rows={exportRows} filename="no_dues_listing" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <ReportScopeFilters
            passingYear={{ value: passingYear, onChange: setPassingYear, options: uniq(records, 'passing_year'), label: 'Passing Years' }}
            institute={{ value: institute, onChange: setInstitute, options: uniq(records, 'institute'), label: 'Institutes' }}
            course={{ value: course, onChange: setCourse, options: uniq(records, 'course'), label: 'Courses' }}
            branch={{ value: branch, onChange: setBranch, options: uniq(records, 'branch'), label: 'Branches' }}
            semester={{ value: semester, onChange: setSemester, options: uniq(records, 'semester'), label: 'Semesters' }}
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
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading No-Due records...</TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No records for the selected filters.</TableCell></TableRow>
                ) : (
                  records.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap">{fmt(row.passing_year)}</TableCell>
                      <TableCell>{fmt(row.enrollment_number)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{fmt(row.student_name)}</TableCell>
                      <TableCell>{fmt(row.institute)}</TableCell>
                      <TableCell>{fmt(row.course)}</TableCell>
                      <TableCell>{fmt(row.branch)}</TableCell>
                      <TableCell className="text-center">{fmt(row.semester)}</TableCell>
                      <TableCell>{fmt(row.contact)}</TableCell>
                      <TableCell>{fmt(row.email)}</TableCell>
                      <TableCell className="whitespace-nowrap">{reasonLabel(row.exit_reason)}</TableCell>
                      <TableCell><LinkCell url={row.proof_url} /></TableCell>
                      <TableCell><LinkCell url={row.student_photo_url} /></TableCell>
                      <TableCell className="text-center">{fmt(row.admission_year)}</TableCell>
                      <TableCell>{fmt(row.batch)}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.no_due_date ? formatDate(row.no_due_date) : '—'}</TableCell>
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
