import { useMemo } from 'react';
import { useMasters } from '@/hooks/use-master-api';
import { formatPostingTypeLabel } from '@/lib/postingModule';

export interface PostingTypeOption {
  /** Master row UUID. Send this to the backend (posting_type_master_id). */
  id: string;
  /** Raw master value (e.g. "Eduskill Virtual Internship"). */
  value: string;
  /** Display label (formatted via formatPostingTypeLabel). */
  label: string;
  /** Audience targeting configured on the posting-type master (name strings). */
  targetInstitutes: string[];
  targetCourses: string[];
  targetBranches: string[];
  targetSemesters: string[];
  targetAcademicYears: string[];
  /** "Application Receiving" toggle — false means Register/apply are blocked (type stays visible). */
  acceptingApplications: boolean;
}

export interface UsePostingTypeOptionsResult {
  options: PostingTypeOption[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

export function usePostingTypeOptions(enabled = true): UsePostingTypeOptionsResult {
  const query = useMasters({ category: 'posting_type' }, enabled);

  const options = useMemo<PostingTypeOption[]>(() => {
    const seen = new Set<string>();
    return (query.data ?? [])
      .filter((master) => {
        const id = master.id;
        const value = master.value?.trim() ?? '';
        if (!id || !value || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((master) => ({
        id: master.id,
        value: master.value.trim(),
        label: formatPostingTypeLabel(master.value.trim()),
        targetInstitutes: master.target_institutes ?? [],
        targetCourses: master.target_courses ?? [],
        targetBranches: master.target_branches ?? [],
        targetSemesters: master.target_semesters ?? [],
        targetAcademicYears: master.target_academic_years ?? [],
        acceptingApplications: master.accepting_applications !== false,
      }));
  }, [query.data]);

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && options.length === 0,
  };
}
