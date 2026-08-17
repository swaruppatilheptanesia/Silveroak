import { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/SearchableSelect';
import { usePolicyBranchOptions, usePolicyCourseOptions, usePolicyInstituteOptions } from '@/hooks/use-policy-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import type { PolicyAudienceOption } from '@/types/policy';

export type DateRangeValue = { from?: Date; to?: Date };

type StringControl = { value: string; onChange: (value: string) => void };

interface AdminListScopeFiltersProps {
  institute?: StringControl;
  course?: StringControl;
  branch?: StringControl;
  semester?: StringControl;
  academicYear?: StringControl;
  passingYear?: StringControl;
  postingType?: StringControl;
  dateRange?: { value: DateRangeValue; onChange: (range: DateRangeValue) => void };
  className?: string;
}

const clean = (value: string) => value.trim().toLowerCase();

function toOptions(options: PolicyAudienceOption[] | undefined): SearchableSelectOption[] {
  const seen = new Set<string>();
  return (options ?? [])
    .filter((option) => Boolean(option.name?.trim()))
    .filter((option) => {
      const key = clean(option.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((option) => ({ value: option.name, label: option.name }));
}

function findIdByName(options: PolicyAudienceOption[] | undefined, name: string): number | null {
  if (!name) return null;
  const match = (options ?? []).find((option) => clean(option.name) === clean(name));
  return match?.id ?? null;
}

function DateRangeFilter({ value, onChange }: { value: DateRangeValue; onChange: (range: DateRangeValue) => void }) {
  const label = value.from
    ? `${format(value.from, 'dd MMM yyyy')}${value.to ? ` – ${format(value.to, 'dd MMM yyyy')}` : ''}`
    : 'Date range';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-start text-left text-xs font-normal">
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-2 p-3 sm:flex-row">
          <div>
            <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">From</p>
            <Calendar mode="single" selected={value.from} onSelect={(date) => onChange({ ...value, from: date })} />
          </div>
          <div>
            <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">To</p>
            <Calendar mode="single" selected={value.to} onSelect={(date) => onChange({ ...value, to: date })} />
          </div>
        </div>
        <div className="flex justify-end border-t p-2">
          <Button variant="ghost" size="sm" onClick={() => onChange({ from: undefined, to: undefined })}>Clear</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function AcademicYearSelect({ control, label }: { control: StringControl; label: string }) {
  const query = useMasterValues('academic_year');
  const options = query.data ?? [];
  return (
    <Select value={control.value} onValueChange={control.onChange}>
      <SelectTrigger className="h-9 w-full text-xs"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SemesterSelect({ control }: { control: StringControl }) {
  return (
    <Select value={control.value} onValueChange={control.onChange}>
      <SelectTrigger className="h-9 w-full text-xs"><SelectValue placeholder="Semester" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Semesters</SelectItem>
        {SEMESTER_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>Semester {option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminListScopeFilters(props: AdminListScopeFiltersProps) {
  const { institute, course, branch, semester, academicYear, passingYear, postingType, dateRange, className } = props;

  const institutesQuery = usePolicyInstituteOptions(Boolean(institute || course || branch));
  const instituteId = findIdByName(institutesQuery.data, institute?.value ?? '');
  const courseQuery = usePolicyCourseOptions(Boolean(course || branch) ? instituteId : null);
  const courseId = findIdByName(courseQuery.data, course?.value ?? '');
  const branchQuery = usePolicyBranchOptions(branch ? courseId : null);

  const instituteOptions = useMemo(() => toOptions(institutesQuery.data), [institutesQuery.data]);
  const courseOptions = useMemo(() => toOptions(courseQuery.data), [courseQuery.data]);
  const branchOptions = useMemo(() => toOptions(branchQuery.data), [branchQuery.data]);

  const { options: postingTypeOptions, isLoading: postingTypesLoading } = usePostingTypeOptions(Boolean(postingType));

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}>
      {institute ? (
        <SearchableSelect
          options={instituteOptions}
          value={institute.value}
          onValueChange={(value) => {
            institute.onChange(value);
            course?.onChange('');
            branch?.onChange('');
          }}
          placeholder="Institute"
          searchPlaceholder="Search institute..."
          emptyMessage="No institutes found."
          loadingMessage="Loading institutes..."
          isLoading={institutesQuery.isLoading}
          clearable
          buttonClassName="h-9 w-full text-xs"
          contentClassName="w-[min(32rem,calc(100vw-2rem))]"
        />
      ) : null}
      {course ? (
        <SearchableSelect
          options={courseOptions}
          value={course.value}
          onValueChange={(value) => {
            course.onChange(value);
            branch?.onChange('');
          }}
          placeholder={instituteId ? 'Course' : 'Select institute first'}
          searchPlaceholder="Search course..."
          emptyMessage="No courses found."
          loadingMessage="Loading courses..."
          disabled={instituteId === null || courseQuery.isLoading}
          isLoading={courseQuery.isLoading}
          clearable
          buttonClassName="h-9 w-full text-xs"
          contentClassName="w-[min(32rem,calc(100vw-2rem))]"
        />
      ) : null}
      {branch ? (
        <SearchableSelect
          options={branchOptions}
          value={branch.value}
          onValueChange={branch.onChange}
          placeholder={courseId ? 'Branch' : 'Select course first'}
          searchPlaceholder="Search branch..."
          emptyMessage="No branches found."
          loadingMessage="Loading branches..."
          disabled={courseId === null || branchQuery.isLoading}
          isLoading={branchQuery.isLoading}
          clearable
          buttonClassName="h-9 w-full text-xs"
          contentClassName="w-[min(32rem,calc(100vw-2rem))]"
        />
      ) : null}
      {semester ? <SemesterSelect control={semester} /> : null}
      {academicYear ? <AcademicYearSelect control={academicYear} label="Academic Years" /> : null}
      {passingYear ? <AcademicYearSelect control={passingYear} label="Passing Years" /> : null}
      {postingType ? (
        <Select value={postingType.value} onValueChange={postingType.onChange} disabled={postingTypesLoading}>
          <SelectTrigger className="h-9 w-full text-xs"><SelectValue placeholder="Posting Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posting Types</SelectItem>
            {postingTypeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {dateRange ? <DateRangeFilter value={dateRange.value} onChange={dateRange.onChange} /> : null}
    </div>
  );
}
