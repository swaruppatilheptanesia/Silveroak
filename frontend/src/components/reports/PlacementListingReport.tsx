import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePlacementListingReport } from '@/hooks/use-report-analytics-api';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));
const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((row) => row[key]).filter((value) => value && value !== '—'))).sort();

function LinkCell({ url }: { url: string | null }) {
  const resolved = url ? resolveBackendAssetUrl(url) : '';
  if (!resolved) return <span className="text-muted-foreground">—</span>;
  return <a href={resolved} target="_blank" rel="noreferrer" className="text-primary underline">Open</a>;
}

export default function PlacementListingReport() {
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

  const { data, isLoading } = usePlacementListingReport(queryParams);
  const records: any[] = data?.records ?? [];

  const headers = [
    'Posting Type', 'Enrollment No', 'Student Name', 'Institute', 'Course', 'Branch', 'Semester', 'Contact', 'Email',
    'Company', 'Designation', 'Package', 'NOC Status', 'Offer Letter', 'Completion Letter', 'Gender', 'Offer Status',
  ];
  const exportRows = records.map((row) => [
    row.posting_type, row.enrollment_number, row.student_name, row.institute, row.course, row.branch, row.semester,
    row.contact, row.email, row.company_name, row.designation, row.package, row.noc_status,
    row.offer_letter_url ? resolveBackendAssetUrl(row.offer_letter_url) : '—',
    row.completion_letter_url ? resolveBackendAssetUrl(row.completion_letter_url) : '—',
    row.gender, row.offer_status,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="Placement Data — Listing & Export" subtitle="Student-level placement records." totalRecords={records.length} headers={headers} rows={exportRows} filename="placement_listing" />

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
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading placement records...</TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No records for the selected filters.</TableCell></TableRow>
                ) : (
                  records.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="capitalize whitespace-nowrap">{fmt(row.posting_type)}</TableCell>
                      <TableCell>{fmt(row.enrollment_number)}</TableCell>
                      <TableCell className="font-medium">{fmt(row.student_name)}</TableCell>
                      <TableCell>{fmt(row.institute)}</TableCell>
                      <TableCell>{fmt(row.course)}</TableCell>
                      <TableCell>{fmt(row.branch)}</TableCell>
                      <TableCell className="text-center">{fmt(row.semester)}</TableCell>
                      <TableCell>{fmt(row.contact)}</TableCell>
                      <TableCell>{fmt(row.email)}</TableCell>
                      <TableCell>{fmt(row.company_name)}</TableCell>
                      <TableCell>{fmt(row.designation)}</TableCell>
                      <TableCell>{fmt(row.package)}</TableCell>
                      <TableCell className="capitalize">{fmt(row.noc_status)}</TableCell>
                      <TableCell><LinkCell url={row.offer_letter_url} /></TableCell>
                      <TableCell><LinkCell url={row.completion_letter_url} /></TableCell>
                      <TableCell className="capitalize">{fmt(row.gender)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(row.offer_status)}</TableCell>
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
