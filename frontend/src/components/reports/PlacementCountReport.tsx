import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePlacementCountReport } from '@/hooks/use-report-analytics-api';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined ? '—' : String(value));
const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((row) => row[key]).filter((value) => value && value !== '—'))).sort();

export default function PlacementCountReport() {
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

  const { data, isLoading } = usePlacementCountReport(queryParams);
  const rows: any[] = data?.rows ?? [];

  const headers = [
    'Posting Type', 'Institute', 'Course', 'Branch', 'Semester', 'Total Students', 'Registered', 'Not Interested',
    'Eligible (CGPA≥6.5)', 'Companies', 'NOC Count', 'Completion Certs', 'Highest Package', 'Average Package',
    'Median Package', 'Lowest Package', 'Accept', 'Reject', 'Pending',
  ];
  const exportRows = rows.map((row) => [
    row.posting_type, row.institute, row.course, row.branch, row.semester, row.total_students, row.registered_students,
    row.not_interested_students, row.eligible_students, row.companies_participated, row.noc_count,
    row.completion_certificate_count, row.highest_package, row.average_package, row.median_package, row.lowest_package,
    row.accept_offer, row.reject_offer, row.pending_offer,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="Placement Count" subtitle="Aggregated placement metrics by posting type and cohort." totalRecords={rows.length} headers={headers} rows={exportRows} filename="placement_count" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <ReportScopeFilters
            postingTypes={{ values: postingTypes, onChange: setPostingTypes }}
            institute={{ value: institute, onChange: setInstitute, options: uniq(rows, 'institute'), label: 'Institutes' }}
            course={{ value: course, onChange: setCourse, options: uniq(rows, 'course'), label: 'Courses' }}
            branch={{ value: branch, onChange: setBranch, options: uniq(rows, 'branch'), label: 'Branches' }}
            semester={{ value: semester, onChange: setSemester, options: uniq(rows, 'semester'), label: 'Semesters' }}
            academicYear={{ value: academicYear, onChange: setAcademicYear, options: academicYearQuery.data ?? [], label: 'Academic Years' }}
          />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap text-center first:text-left">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading placement data...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No data for the selected filters.</TableCell></TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium capitalize whitespace-nowrap">{fmt(row.posting_type)}</TableCell>
                      <TableCell>{fmt(row.institute)}</TableCell>
                      <TableCell>{fmt(row.course)}</TableCell>
                      <TableCell>{fmt(row.branch)}</TableCell>
                      <TableCell className="text-center">{fmt(row.semester)}</TableCell>
                      <TableCell className="text-center font-medium">{fmt(row.total_students)}</TableCell>
                      <TableCell className="text-center text-green-600">{fmt(row.registered_students)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{fmt(row.not_interested_students)}</TableCell>
                      <TableCell className="text-center">{fmt(row.eligible_students)}</TableCell>
                      <TableCell className="text-center">{fmt(row.companies_participated)}</TableCell>
                      <TableCell className="text-center">{fmt(row.noc_count)}</TableCell>
                      <TableCell className="text-center">{fmt(row.completion_certificate_count)}</TableCell>
                      <TableCell className="text-center">{fmt(row.highest_package)}</TableCell>
                      <TableCell className="text-center">{fmt(row.average_package)}</TableCell>
                      <TableCell className="text-center">{fmt(row.median_package)}</TableCell>
                      <TableCell className="text-center">{fmt(row.lowest_package)}</TableCell>
                      <TableCell className="text-center text-green-600">{fmt(row.accept_offer)}</TableCell>
                      <TableCell className="text-center text-destructive">{fmt(row.reject_offer)}</TableCell>
                      <TableCell className="text-center text-amber-600">{fmt(row.pending_offer)}</TableCell>
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
