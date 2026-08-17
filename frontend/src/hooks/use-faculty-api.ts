import { useQuery } from '@tanstack/react-query';
import { facultyService } from '@/services/facultyService';
import type { FacultyStudentsQueryParams } from '@/types/faculty';

export const facultyKeys = {
  all: ['faculty'] as const,
  dashboard: () => [...facultyKeys.all, 'dashboard'] as const,
  students: (params: FacultyStudentsQueryParams) => [...facultyKeys.all, 'students', params] as const,
  studentFilterOptions: () => [...facultyKeys.all, 'students', 'filter-options'] as const,
  studentDetail: (studentId: string) => [...facultyKeys.all, 'students', studentId] as const,
  programs: () => [...facultyKeys.all, 'programs'] as const,
  programStudents: (postingType: string, search?: string) =>
    [...facultyKeys.all, 'programs', postingType, search ?? ''] as const,
};

export function useFacultyDashboard() {
  return useQuery({
    queryKey: facultyKeys.dashboard(),
    queryFn: () => facultyService.getDashboard(),
    staleTime: 60 * 1000,
  });
}

export function useFacultyStudents(params: FacultyStudentsQueryParams = {}) {
  return useQuery({
    queryKey: facultyKeys.students(params),
    queryFn: () => facultyService.getStudents(params),
    staleTime: 60 * 1000,
  });
}

export function useFacultyStudentDetail(studentId: string) {
  return useQuery({
    queryKey: facultyKeys.studentDetail(studentId),
    queryFn: () => facultyService.getStudentDetail(studentId),
    enabled: Boolean(studentId),
  });
}

export function useFacultyStudentFilterOptions() {
  return useQuery({
    queryKey: facultyKeys.studentFilterOptions(),
    queryFn: () => facultyService.getStudentFilterOptions(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFacultyAssignedPrograms() {
  return useQuery({
    queryKey: facultyKeys.programs(),
    queryFn: () => facultyService.getAssignedPrograms(),
    staleTime: 60 * 1000,
  });
}

export function useFacultyProgramStudents(postingType: string, params: { search?: string } = {}) {
  return useQuery({
    queryKey: facultyKeys.programStudents(postingType, params.search),
    queryFn: () => facultyService.getProgramStudents(postingType, params),
    enabled: Boolean(postingType),
    staleTime: 60 * 1000,
  });
}
