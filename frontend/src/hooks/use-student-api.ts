/**
 * React Query hooks for the Student API module.
 * Provides query & mutation hooks for profile, projects, certifications,
 * employment, resumes, policy, and interests.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import { policyKeys } from '@/hooks/use-policy-api';
import type {
  ApiStudentProfile,
  UpdatePersonalInput,
  UpdateAcademicInput,
  UpdateSkillsInput,
  CreateProjectInput,
  CreateCertificationInput,
  CreateEmploymentInput,
  PolicyAcceptanceInput,
  InterestRegistrationInput,
  GlobalPlacementOptOutInput,
  PostingTypePreferenceInput,
} from '@/types/student';

// ── Query Keys ─────────────────────────────────────────

export const studentKeys = {
  all: ['student'] as const,
  profile: () => [...studentKeys.all, 'profile'] as const,
  projects: () => [...studentKeys.all, 'projects'] as const,
  certifications: () => [...studentKeys.all, 'certifications'] as const,
  employment: () => [...studentKeys.all, 'employment'] as const,
  resumes: () => [...studentKeys.all, 'resumes'] as const,
  interests: () => [...studentKeys.all, 'interests'] as const,
  placementPreferences: () => [...studentKeys.all, 'placement-preferences'] as const,
};

// ── Profile ────────────────────────────────────────────

export function useStudentProfile(enabled = true) {
  return useQuery({
    queryKey: studentKeys.profile(),
    queryFn: () => studentService.getMyProfile(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdatePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePersonalInput) => studentService.updatePersonal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}

export function useUploadStudentProfilePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => studentService.uploadProfilePhoto(file),
    onSuccess: (student) => {
      qc.setQueryData(studentKeys.profile(), (current: ApiStudentProfile | undefined) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          student: {
            ...current.student,
            ...student,
          },
        };
      });
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}

export function useUpdateAcademic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAcademicInput) => studentService.updateAcademic(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}

export function useUpdateSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSkillsInput) => studentService.updateSkills(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}

// ── Projects ───────────────────────────────────────────

export function useStudentProjects() {
  return useQuery({
    queryKey: studentKeys.projects(),
    queryFn: () => studentService.getProjects(),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => studentService.createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.projects() });
      qc.invalidateQueries({ queryKey: studentKeys.profile() }); // profile_completion changes
      qc.invalidateQueries({ queryKey: ['portfolio', 'me'] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<CreateProjectInput> }) =>
      studentService.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.projects() });
      qc.invalidateQueries({ queryKey: ['portfolio', 'me'] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => studentService.deleteProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.projects() });
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
      qc.invalidateQueries({ queryKey: ['portfolio', 'me'] });
    },
  });
}

// ── Certifications ─────────────────────────────────────

export function useStudentCertifications() {
  return useQuery({
    queryKey: studentKeys.certifications(),
    queryFn: () => studentService.getCertifications(),
  });
}

export function useCreateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCertificationInput) => studentService.createCertification(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.certifications() });
    },
  });
}

export function useUploadCertificationDocument() {
  return useMutation({
    mutationFn: (file: File) => studentService.uploadCertificationDocument(file),
  });
}

export function useDeleteCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => studentService.deleteCertification(certId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.certifications() });
    },
  });
}

// ── Employment ─────────────────────────────────────────

export function useStudentEmployments() {
  return useQuery({
    queryKey: studentKeys.employment(),
    queryFn: () => studentService.getEmployments(),
  });
}

function invalidateEmployment(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: studentKeys.employment() });
  qc.invalidateQueries({ queryKey: studentKeys.profile() });
}

export function useCreateEmployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateEmploymentInput; file: File }) =>
      studentService.createEmployment(data, file),
    onSuccess: () => invalidateEmployment(qc),
  });
}

export function useCloseEmployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => studentService.closeEmployment(id, file),
    onSuccess: () => invalidateEmployment(qc),
  });
}

export function useDeleteEmployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentService.deleteEmployment(id),
    onSuccess: () => invalidateEmployment(qc),
  });
}

// ── Resumes ────────────────────────────────────────────

export function useStudentResumes() {
  return useQuery({
    queryKey: studentKeys.resumes(),
    queryFn: () => studentService.getResumes(),
  });
}

export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) =>
      studentService.uploadResume(file, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.resumes() });
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}

export function useSetDefaultResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => studentService.setDefaultResume(resumeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.resumes() });
    },
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => studentService.deleteResume(resumeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.resumes() });
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}

// ── Policy Acceptance ──────────────────────────────────

export function useAcceptPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PolicyAcceptanceInput) => studentService.acceptPolicy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
      // Refresh policy lists so accepted_current flips in the gate + profile tab.
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}

// ── Interest Registration ──────────────────────────────

export function useStudentInterests() {
  return useQuery({
    queryKey: studentKeys.interests(),
    queryFn: () => studentService.getInterests(),
  });
}

export function useRegisterInterests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InterestRegistrationInput) => studentService.registerInterests(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.interests() });
    },
  });
}

// ── Placement preferences (opt-out) ──

export function usePlacementPreferences(enabled = true) {
  return useQuery({
    queryKey: studentKeys.placementPreferences(),
    queryFn: () => studentService.getPlacementPreferences(),
    enabled,
  });
}

export function useUpdateGlobalPlacementOptOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GlobalPlacementOptOutInput) => studentService.updateGlobalPlacementOptOut(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.placementPreferences() });
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}

export function useUpdatePostingTypePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PostingTypePreferenceInput) => studentService.updatePostingTypePreference(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.placementPreferences() });
      qc.invalidateQueries({ queryKey: studentKeys.profile() });
    },
  });
}
