import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMasterValues } from '@/hooks/use-master-api';
import { useInternshipNocCountReport } from '@/hooks/use-report-analytics-api';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined ? '—' : String(value));
const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((row) => row[key]).filter((value) => value && value !== '—'))).sort();

export default function InternshipNocCountReport() {
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

  const { data, isLoading } = useInternshipNocCountReport(queryParams);
  const rows: any[] = data?.rows ?? [];

  const headers = [
    'Posting Type', 'Institute', 'Course', 'Branch', 'Semester', 'Total Students', 'NOC Count', 'NOC Accept', 'NOC Reject',
    'Without NOC', 'University Drive', 'Self-Sourced', 'Highest Stipend', 'Average Stipend', 'Completion Certs', 'Companies',
  ];
  const exportRows = rows.map((row) => [
    row.posting_type, row.institute, row.course, row.branch, row.semester, row.total_students, row.noc_count, row.noc_accept,
    row.noc_reject, row.students_without_noc, row.university_drive, row.self_sourced, row.highest_stipend, row.average_stipend,
    row.completion_certificate_count, row.company_count,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="Internship / NOC Count" subtitle="Aggregated NOC & internship metrics by posting type and cohort." totalRecords={rows.length} headers={headers} rows={exportRows} filename="internship_noc_count" />

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
                  {headers.map((header) => (<TableHead key={header} className="whitespace-nowrap text-center first:text-left">{header}</TableHead>))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading NOC data...</TableCell></TableRow>
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
                      <TableCell className="text-center">{fmt(row.noc_count)}</TableCell>
                      <TableCell className="text-center text-green-600">{fmt(row.noc_accept)}</TableCell>
                      <TableCell className="text-center text-destructive">{fmt(row.noc_reject)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{fmt(row.students_without_noc)}</TableCell>
                      <TableCell className="text-center">{fmt(row.university_drive)}</TableCell>
                      <TableCell className="text-center">{fmt(row.self_sourced)}</TableCell>
                      <TableCell className="text-center">{fmt(row.highest_stipend)}</TableCell>
                      <TableCell className="text-center">{fmt(row.average_stipend)}</TableCell>
                      <TableCell className="text-center">{fmt(row.completion_certificate_count)}</TableCell>
                      <TableCell className="text-center">{fmt(row.company_count)}</TableCell>
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
