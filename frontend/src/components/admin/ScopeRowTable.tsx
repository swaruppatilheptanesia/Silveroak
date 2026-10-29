import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/SearchableSelect';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { usePolicyInstituteOptions } from '@/hooks/use-policy-api';
import { policyService } from '@/services/policyService';
import type { PolicyAudienceOption } from '@/types/policy';
import type { ScopeRow } from '@/types/master';

// Matches the Semester picker used by UserScopeSelector (static 1..12).
const SEMESTER_OPTIONS: SearchableSelectOption[] = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: `Semester ${value}`, keywords: [value] };
});

function toSelectOptions(options: PolicyAudienceOption[] | undefined): SearchableSelectOption[] {
  return (options ?? [])
    .filter((option) => Boolean(option.name.trim()))
    .map((option) => ({ value: option.name, label: option.name }));
}

function findIdByName(options: PolicyAudienceOption[] | undefined, name: string): number | null {
  const match = (options ?? []).find(
    (option) => option.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  return match ? match.id : null;
}

const EMPTY_ROW: ScopeRow = { institute: '', course: '', branch: '', semesters: [] };

/**
 * One cascading targeting row (Institute → Course → Branch → Semester). Owns its own course/branch queries
 * (which is why each row is its own component — hooks can't run inside a .map). Stores NAMES on the row;
 * resolves ids internally to drive the cascade.
 */
function ScopeRowEditor({
  row,
  instituteOptions,
  institutesLoading,
  onChange,
  onRemove,
}: {
  row: ScopeRow;
  instituteOptions: PolicyAudienceOption[];
  institutesLoading: boolean;
  onChange: (row: ScopeRow) => void;
  onRemove: () => void;
}) {
  const instituteId = useMemo(
    () => findIdByName(instituteOptions, row.institute),
    [instituteOptions, row.institute],
  );

  const coursesQuery = useQuery({
    queryKey: ['scope-row', 'courses', instituteId],
    queryFn: () => policyService.getCourseOptions(Number(instituteId)),
    enabled: Boolean(instituteId),
    staleTime: 30 * 60 * 1000,
  });

  const courseId = useMemo(
    () => findIdByName(coursesQuery.data, row.course),
    [coursesQuery.data, row.course],
  );

  const branchesQuery = useQuery({
    queryKey: ['scope-row', 'branches', courseId],
    queryFn: () => policyService.getBranchOptions(Number(courseId)),
    enabled: Boolean(courseId),
    staleTime: 30 * 60 * 1000,
  });

  const instituteOptionsSearch = useMemo(() => toSelectOptions(instituteOptions), [instituteOptions]);
  const courseOptionsSearch = useMemo(() => toSelectOptions(coursesQuery.data), [coursesQuery.data]);
  const branchOptionsSearch = useMemo(() => toSelectOptions(branchesQuery.data), [branchesQuery.data]);

  return (
    <TableRow>
      <TableCell className="align-top">
        <SearchableSelect
          options={instituteOptionsSearch}
          value={row.institute}
          onValueChange={(value) => onChange({ ...row, institute: value, course: '', branch: '' })}
          placeholder="Select institute"
          searchPlaceholder="Search institute..."
          isLoading={institutesLoading}
          loadingMessage="Loading institutes..."
        />
      </TableCell>
      <TableCell className="align-top">
        <SearchableSelect
          options={courseOptionsSearch}
          value={row.course}
          onValueChange={(value) => onChange({ ...row, course: value, branch: '' })}
          placeholder={row.institute ? 'Select course' : 'Select institute first'}
          searchPlaceholder="Search course..."
          disabled={!row.institute || coursesQuery.isLoading}
          isLoading={coursesQuery.isLoading}
          loadingMessage="Loading courses..."
        />
      </TableCell>
      <TableCell className="align-top">
        <SearchableSelect
          options={branchOptionsSearch}
          value={row.branch}
          onValueChange={(value) => onChange({ ...row, branch: value })}
          placeholder={row.course ? 'Select branch' : 'Select course first'}
          searchPlaceholder="Search branch..."
          disabled={!row.course || branchesQuery.isLoading}
          isLoading={branchesQuery.isLoading}
          loadingMessage="Loading branches..."
        />
      </TableCell>
      <TableCell className="align-top">
        <SearchableMultiSelect
          options={SEMESTER_OPTIONS}
          values={row.semesters}
          onChange={(values) => onChange({ ...row, semesters: values })}
          placeholder="Select"
          maxChips={2}
        />
      </TableCell>
      <TableCell className="text-right align-top">
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-8 w-8"
          onClick={onRemove}
          aria-label="Remove scope row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/**
 * Cascading Institute → Course → Branch → Semester targeting for a Posting Type. Each row is one complete
 * eligible combination (all cells required); a student matching ANY row is eligible. Rows add/delete.
 */
export function ScopeRowTable({
  rows,
  onChange,
}: {
  rows: ScopeRow[];
  onChange: (rows: ScopeRow[]) => void;
}) {
  const institutesQuery = usePolicyInstituteOptions();
  const instituteOptions = institutesQuery.data ?? [];

  const addRow = () => onChange([...rows, { ...EMPTY_ROW }]);
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const updateRow = (index: number, next: ScopeRow) =>
    onChange(rows.map((row, i) => (i === index ? next : row)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Institute / Course / Branch / Semester</p>
        <p className="text-xs text-muted-foreground">
          Each row is one eligible combination — a student matching any row can see the type.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="w-full table-fixed [&_th]:px-2 [&_td]:p-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[27%]">Institute</TableHead>
              <TableHead className="w-[23%]">Course</TableHead>
              <TableHead className="w-[23%]">Branch</TableHead>
              <TableHead className="w-[19%]">Semester</TableHead>
              <TableHead className="w-[44px] text-right">
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 bg-green-600 text-white hover:bg-green-700"
                  onClick={addRow}
                  aria-label="Add scope row"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No targeting rows — this posting type is visible to all students. Use “+” to restrict it.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <ScopeRowEditor
                  key={index}
                  row={row}
                  instituteOptions={instituteOptions}
                  institutesLoading={institutesQuery.isLoading}
                  onChange={(next) => updateRow(index, next)}
                  onRemove={() => removeRow(index)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
