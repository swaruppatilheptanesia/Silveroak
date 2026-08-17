import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNoDuesCountReport } from '@/hooks/use-report-analytics-api';
import { EXIT_REASON_LABELS } from '@/types/noDues';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined ? '—' : String(value));
const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((row) => row[key]).filter((value) => value && value !== '—'))).sort();

export default function NoDuesCountReport() {
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

  const { data, isLoading } = useNoDuesCountReport(queryParams);
  const rows: any[] = data?.rows ?? [];

  const headers = [
    'Passing Year', 'Institute', 'Course', 'Branch', 'Semester', 'Total Students', 'No-Due Count',
    EXIT_REASON_LABELS.employment, EXIT_REASON_LABELS.family_business, EXIT_REASON_LABELS.planning_studies,
    EXIT_REASON_LABELS.higher_studies, EXIT_REASON_LABELS.competitive_exam,
  ];
  const exportRows = rows.map((row) => [
    row.passing_year, row.institute, row.course, row.branch, row.semester, row.total_students, row.no_due_count,
    row.employment, row.family_business, row.planning_studies, row.higher_studies, row.competitive_exam,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="No-Due Count" subtitle="No-Due totals & plan-after-graduation breakdown by cohort." totalRecords={rows.length} headers={headers} rows={exportRows} filename="no_dues_count" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <ReportScopeFilters
            passingYear={{ value: passingYear, onChange: setPassingYear, options: uniq(rows, 'passing_year'), label: 'Passing Years' }}
            institute={{ value: institute, onChange: setInstitute, options: uniq(rows, 'institute'), label: 'Institutes' }}
            course={{ value: course, onChange: setCourse, options: uniq(rows, 'course'), label: 'Courses' }}
            branch={{ value: branch, onChange: setBranch, options: uniq(rows, 'branch'), label: 'Branches' }}
            semester={{ value: semester, onChange: setSemester, options: uniq(rows, 'semester'), label: 'Semesters' }}
          />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (<TableHead key={header} className="whitespace-nowrap text-center first:text-left">{header}</TableHead>))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading No-Due data...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No data for the selected filters.</TableCell></TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium whitespace-nowrap">{fmt(row.passing_year)}</TableCell>
                      <TableCell>{fmt(row.institute)}</TableCell>
                      <TableCell>{fmt(row.course)}</TableCell>
                      <TableCell>{fmt(row.branch)}</TableCell>
                      <TableCell className="text-center">{fmt(row.semester)}</TableCell>
                      <TableCell className="text-center font-medium">{fmt(row.total_students)}</TableCell>
                      <TableCell className="text-center">{fmt(row.no_due_count)}</TableCell>
                      <TableCell className="text-center">{fmt(row.employment)}</TableCell>
                      <TableCell className="text-center">{fmt(row.family_business)}</TableCell>
                      <TableCell className="text-center">{fmt(row.planning_studies)}</TableCell>
                      <TableCell className="text-center">{fmt(row.higher_studies)}</TableCell>
                      <TableCell className="text-center">{fmt(row.competitive_exam)}</TableCell>
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
