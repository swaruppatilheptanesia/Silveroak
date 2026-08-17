import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from '@/lib/passwordPolicy';
import {
  ArrowRight,
  Award,
  Briefcase,
  Camera,
  ExternalLink,
  FileUp,
  FolderKanban,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Tag,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { RequiredLabel } from '@/components/shared/RequiredLabel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MasterSuggestionChips } from '@/components/shared/MasterSuggestionChips';
import { StudentPoliciesTab } from '@/components/policies/StudentPoliciesTab';
import { StudentPlacementTab } from '@/components/placement/StudentPlacementTab';
import { ProfilePhotoCropper } from '@/components/profile/ProfilePhotoCropper';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { authService } from '@/services/authService';
import { locationOptions } from '@/services/studentService';
import {
  useCreateCertification,
  useCreateProject,
  useDeleteCertification,
  useDeleteProject,
  useStudentCertifications,
  useStudentInterests,
  useStudentProfile,
  useStudentProjects,
  useStudentResumes,
  useUpdatePersonal,
  useUpdateProject,
  useUpdateSkills,
  useUploadCertificationDocument,
  useUploadStudentProfilePhoto,
} from '@/hooks/use-student-api';
import { StudentEmploymentTab } from '@/components/employment/StudentEmploymentTab';
import { useMasterValues } from '@/hooks/use-master-api';
import { formatCGPA, formatDate, formatLPA, formatPhoneNumber, getInitials } from '@/lib/formatters';
import { appendMasterValueToCsv, removeMasterValueFromCsv } from '@/lib/masterModule';
import {
  formatCommaSeparatedList,
  formatInterestLabel,
  parseCommaSeparatedList,
  resolveBackendAssetUrl,
  toDateInputValue,
} from '@/lib/studentModule';
import type { ApiProject, CreateProjectInput } from '@/types/student';

type PersonalForm = {
  full_name: string;
  mobile: string;
  alternate_phone: string;
  date_of_birth: string;
  gender: string;
  linkedin_url: string;
  residential_address: string;
  permanent_address: string;
};

type AcademicForm = {
  cgpa: string;
  tenth_percentage: string;
  twelfth_percentage: string;
  diploma_percentage: string;
  backlog_count: string;
  active_backlogs: string;
  semester: string;
  year_of_study: string;
  course_duration: string;
};

type SkillsForm = {
  technical_skills: string;
  domain_interests: string;
  preferred_locations: string;
};


type ProjectDraft = {
  title: string;
  description: string;
  technologies: string;
  github_url: string;
  demo_url: string;
  start_date: string;
  end_date: string;
  is_ongoing: boolean;
};

type CertificationDraft = {
  name: string;
  issuer: string;
  issue_date: string;
  credential_url: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
};

type DeleteTarget = {
  type: 'project' | 'certification';
  id: string;
  label: string;
} | null;

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function normalizeNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const MAX_TECHNICAL_SKILLS = 5;

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function emptyProjectDraft(): ProjectDraft {
  return {
    title: '',
    description: '',
    technologies: '',
    github_url: '',
    demo_url: '',
    start_date: '',
    end_date: '',
    is_ongoing: false,
  };
}

function emptyCertificationDraft(): CertificationDraft {
  return {
    name: '',
    issuer: '',
    issue_date: '',
    credential_url: '',
  };
}

function makeProjectDraft(project?: ApiProject | null): ProjectDraft {
  if (!project) {
    return emptyProjectDraft();
  }

  return {
    title: project.title,
    description: project.description ?? '',
    technologies: formatCommaSeparatedList(project.technologies),
    github_url: project.github_url ?? '',
    demo_url: project.demo_url ?? '',
    start_date: toDateInputValue(project.start_date),
    end_date: toDateInputValue(project.end_date),
    is_ongoing: project.is_ongoing,
  };
}

function ProfileSkeleton() {
  return (
    <DashboardLayout
      title="Student Profile"
      subtitle="Loading your profile data"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full bg-muted" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48 bg-muted" />
                <Skeleton className="h-4 w-64 bg-muted" />
                <Skeleton className="h-10 w-40 bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} readOnly className="bg-muted/40" />
    </div>
  );
}

function ReadonlyTextarea({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value} readOnly rows={4} className="bg-muted/40" />
    </div>
  );
}

export default function Profile() {
  const profileQuery = useStudentProfile();
  const projectsQuery = useStudentProjects();
  const certificationsQuery = useStudentCertifications();
  const resumesQuery = useStudentResumes();
  const interestsQuery = useStudentInterests();

  const updatePersonal = useUpdatePersonal();
  const uploadProfilePhoto = useUploadStudentProfilePhoto();
  const skillMasterValues = useMasterValues('skill');
  const interestMasterValues = useMasterValues('interest');
  const technologyMasterValues = useMasterValues('technology');
  const updateSkills = useUpdateSkills();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createCertification = useCreateCertification();
  const uploadCertificationDocument = useUploadCertificationDocument();
  const deleteCertification = useDeleteCertification();

  const [personalForm, setPersonalForm] = useState<PersonalForm>({
    full_name: '',
    mobile: '',
    alternate_phone: '',
    date_of_birth: '',
    gender: '',
    linkedin_url: '',
    residential_address: '',
    permanent_address: '',
  });
  const [academicForm, setAcademicForm] = useState<AcademicForm>({
    cgpa: '',
    tenth_percentage: '',
    twelfth_percentage: '',
    diploma_percentage: '',
    backlog_count: '0',
    active_backlogs: '0',
    semester: '',
    year_of_study: '',
    course_duration: '',
  });
  const [skillsForm, setSkillsForm] = useState<SkillsForm>({
    technical_skills: '',
    domain_interests: '',
    preferred_locations: '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });

  const [showProjectEditor, setShowProjectEditor] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(emptyProjectDraft());
  // Today as a local YYYY-MM-DD string (avoids the UTC off-by-one of toISOString) — used to
  // cap the project date pickers and to reject future dates on save.
  const todayIso = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [certificationDraft, setCertificationDraft] = useState<CertificationDraft>(emptyCertificationDraft());
  const [selectedCertificationDocument, setSelectedCertificationDocument] = useState<File | null>(null);
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<File | null>(null);
  const [selectedProfilePhotoPreview, setSelectedProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const certificationDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profileQuery.data) return;

    const { student, academic, skills } = profileQuery.data;

    setPersonalForm({
      full_name: student.full_name ?? '',
      mobile: student.mobile ?? '',
      alternate_phone: student.alternate_phone ?? '',
      date_of_birth: toDateInputValue(student.date_of_birth),
      gender: student.gender ?? '',
      linkedin_url: student.linkedin_url ?? '',
      residential_address: student.residential_address ?? '',
      permanent_address: student.permanent_address ?? '',
    });

    setAcademicForm({
      cgpa: academic?.cgpa != null ? String(academic.cgpa) : '',
      tenth_percentage: academic?.tenth_percentage != null ? String(academic.tenth_percentage) : '',
      twelfth_percentage: academic?.twelfth_percentage != null ? String(academic.twelfth_percentage) : '',
      diploma_percentage: academic?.diploma_percentage != null ? String(academic.diploma_percentage) : '',
      backlog_count: academic?.backlog_count != null ? String(academic.backlog_count) : '0',
      active_backlogs: academic?.active_backlogs != null ? String(academic.active_backlogs) : '0',
      semester: academic?.semester != null ? String(academic.semester) : '',
      year_of_study: academic?.year_of_study != null ? String(academic.year_of_study) : '',
      course_duration: academic?.course_duration != null ? String(academic.course_duration) : '',
    });

    setSkillsForm({
      technical_skills: formatCommaSeparatedList(skills?.technical_skills),
      domain_interests: formatCommaSeparatedList(skills?.domain_interests),
      preferred_locations: formatCommaSeparatedList(skills?.preferred_locations),
    });
  }, [profileQuery.data]);

  useEffect(() => {
    if (!selectedProfilePhoto) {
      setSelectedProfilePhotoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedProfilePhoto);
    setSelectedProfilePhotoPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedProfilePhoto]);

  useEffect(() => {
    if (!selectedProfilePhoto) {
      setProfilePhotoDialogOpen(false);
    }
  }, [selectedProfilePhoto]);

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />;
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <DashboardLayout
        title="Student Profile"
        subtitle="Unable to load profile data"
      >
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Unable to load student profile</AlertTitle>
          <AlertDescription>
            {getErrorMessage(profileQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { student, academic } = profileQuery.data;
  const projects = projectsQuery.data ?? [];
  const certifications = certificationsQuery.data ?? [];
  const resumes = resumesQuery.data ?? [];
  const interests = interestsQuery.data ?? [];
  const profileCompletion = student.profile_completion_percentage;
  const isProjectSaving = createProject.isPending || updateProject.isPending;
  const deleteTargetLabel = deleteTarget?.label ?? 'item';

  async function handleSavePersonal() {
    const alternatePhone = personalForm.alternate_phone.trim();
    const linkedinUrl = personalForm.linkedin_url.trim();

    if (linkedinUrl && !isValidHttpUrl(linkedinUrl)) {
      toast.error('Enter a valid LinkedIn URL.');
      return;
    }

    try {
      await updatePersonal.mutateAsync({
        alternate_phone: alternatePhone || null,
        linkedin_url: linkedinUrl || null,
      });
      toast.success('Personal details updated.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update personal details.'));
    }
  }

  async function handleUploadProfilePhoto() {
    if (!selectedProfilePhoto) {
      toast.error('Choose a profile photo from your device first.');
      return;
    }

    try {
      await uploadProfilePhoto.mutateAsync(selectedProfilePhoto);
      setProfilePhotoDialogOpen(false);
      setSelectedProfilePhoto(null);
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = '';
      }
      toast.success('Profile photo updated.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to upload profile photo.'));
    }
  }

  async function handleApplyProfilePhotoCrop(croppedFile: File) {
    setSelectedProfilePhoto(croppedFile);
    toast.success('Profile photo crop updated.');
  }

  async function handleSaveSkills() {
    const technicalSkills = parseCommaSeparatedList(skillsForm.technical_skills);
    if (technicalSkills.length > MAX_TECHNICAL_SKILLS) {
      toast.error(`You can select at most ${MAX_TECHNICAL_SKILLS} technical skills.`);
      return;
    }

    try {
      await updateSkills.mutateAsync({
        technical_skills: technicalSkills,
        domain_interests: parseCommaSeparatedList(skillsForm.domain_interests),
        preferred_locations: parseCommaSeparatedList(skillsForm.preferred_locations),
      });
      toast.success('Skills profile updated.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update skills.'));
    }
  }

  function appendSkillSuggestion(field: keyof Pick<SkillsForm, 'technical_skills' | 'domain_interests'>, value: string) {
    if (field === 'technical_skills') {
      const currentSkills = parseCommaSeparatedList(skillsForm.technical_skills);
      const normalizedValue = value.trim().toLowerCase();
      const alreadySelected = currentSkills.some((skill) => skill.trim().toLowerCase() === normalizedValue);

      if (!alreadySelected && currentSkills.length >= MAX_TECHNICAL_SKILLS) {
        toast.error(`You can select at most ${MAX_TECHNICAL_SKILLS} technical skills.`);
        return;
      }
    }

    setSkillsForm((current) => ({
      ...current,
      [field]: appendMasterValueToCsv(current[field], value),
    }));
  }

  function appendProjectTechnology(value: string) {
    setProjectDraft((current) => ({
      ...current,
      technologies: appendMasterValueToCsv(current.technologies, value),
    }));
  }

  async function handleChangePassword() {
    if (!passwordForm.current_password.trim() || !passwordForm.new_password.trim()) {
      toast.error('Current password and new password are required.');
      return;
    }
    const passwordPolicyError = getPasswordPolicyError(passwordForm.new_password);
    if (passwordPolicyError) {
      toast.error(passwordPolicyError);
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      toast.error('New password and confirmation must match.');
      return;
    }

    try {
      await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_new_password: passwordForm.confirm_new_password,
      });
      toast.success('Password updated successfully.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
      });
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to change password.'));
    }
  }


  function startNewProject() {
    setEditingProjectId(null);
    setProjectDraft(emptyProjectDraft());
    setShowProjectEditor(true);
  }

  function startEditingProject(project: ApiProject) {
    setEditingProjectId(project.id);
    setProjectDraft(makeProjectDraft(project));
    setShowProjectEditor(true);
  }

  function closeProjectEditor() {
    setEditingProjectId(null);
    setProjectDraft(emptyProjectDraft());
    setShowProjectEditor(false);
  }

  async function handleSaveProject() {
    if (!projectDraft.title.trim()) {
      toast.error('Project title is required.');
      return;
    }

    if (!projectDraft.description.trim()) {
      toast.error('Project description is required.');
      return;
    }

    const technologies = parseCommaSeparatedList(projectDraft.technologies);
    if (technologies.length === 0) {
      toast.error('Add at least one technology.');
      return;
    }

    if (projectDraft.github_url.trim() && !isValidHttpUrl(projectDraft.github_url)) {
      toast.error('Enter a valid GitHub URL.');
      return;
    }

    if (projectDraft.demo_url.trim() && !isValidHttpUrl(projectDraft.demo_url)) {
      toast.error('Enter a valid demo URL.');
      return;
    }

    if (!projectDraft.start_date.trim()) {
      toast.error('Project start date is required.');
      return;
    }

    if (projectDraft.start_date > todayIso) {
      toast.error('Start date cannot be in the future.');
      return;
    }

    if (!projectDraft.is_ongoing && !projectDraft.end_date.trim()) {
      toast.error('Project end date is required for completed projects.');
      return;
    }

    if (!projectDraft.is_ongoing && projectDraft.end_date.trim()) {
      if (projectDraft.end_date > todayIso) {
        toast.error('End date cannot be in the future.');
        return;
      }
      if (projectDraft.start_date > projectDraft.end_date) {
        toast.error('Start date cannot be after the end date.');
        return;
      }
    }

    const payload: CreateProjectInput = {
      title: projectDraft.title.trim(),
      description: projectDraft.description.trim(),
      technologies,
      github_url: normalizeNullableString(projectDraft.github_url),
      demo_url: normalizeNullableString(projectDraft.demo_url),
      start_date: normalizeNullableString(projectDraft.start_date),
      end_date: projectDraft.is_ongoing ? null : normalizeNullableString(projectDraft.end_date),
      is_ongoing: projectDraft.is_ongoing,
    };

    try {
      if (editingProjectId) {
        await updateProject.mutateAsync({
          projectId: editingProjectId,
          data: payload,
        });
        toast.success('Project updated.');
      } else {
        await createProject.mutateAsync(payload);
        toast.success('Project added.');
      }
      closeProjectEditor();
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to save the project.'));
    }
  }

  function handleDeleteProject(projectId: string, projectTitle: string) {
    setDeleteTarget({ type: 'project', id: projectId, label: projectTitle });
  }

  async function handleAddCertification() {
    if (!certificationDraft.name.trim() || !certificationDraft.issuer.trim()) {
      toast.error('Certification name and issuer are required.');
      return;
    }
    if (certificationDraft.issue_date && certificationDraft.issue_date > todayIso) {
      toast.error('Issue date cannot be in the future.');
      return;
    }
    if (!selectedCertificationDocument) {
      toast.error('Upload a supporting document for this certification.');
      return;
    }

    try {
      const uploadedDocument = await uploadCertificationDocument.mutateAsync(selectedCertificationDocument);
      await createCertification.mutateAsync({
        name: certificationDraft.name.trim(),
        issuer: certificationDraft.issuer.trim(),
        issue_date: normalizeNullableString(certificationDraft.issue_date),
        credential_url: normalizeNullableString(certificationDraft.credential_url),
        document_url: uploadedDocument.document_url,
        document_name: uploadedDocument.document_name,
        document_mime_type: uploadedDocument.document_mime_type,
        document_size: uploadedDocument.document_size,
      });
      toast.success('Certification added.');
      setCertificationDraft(emptyCertificationDraft());
      setSelectedCertificationDocument(null);
      if (certificationDocumentInputRef.current) {
        certificationDocumentInputRef.current.value = '';
      }
      setShowCertificationForm(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to add certification.'));
    }
  }

  function handleDeleteCertification(certId: string, certificationName: string) {
    setDeleteTarget({ type: 'certification', id: certId, label: certificationName });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'project') {
        await deleteProject.mutateAsync(deleteTarget.id);
        toast.success('Project deleted.');
        if (editingProjectId === deleteTarget.id) {
          closeProjectEditor();
        }
      } else {
        await deleteCertification.mutateAsync(deleteTarget.id);
        toast.success('Certification deleted.');
      }
      setDeleteTarget(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to delete the selected record.'));
    }
  }

  return (
    <DashboardLayout
      title="Student Profile"
      subtitle="Review your profile and manage the student-owned fields"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Avatar className="h-20 w-20 border border-border transition-opacity group-hover:opacity-90">
                    <AvatarImage
                      src={
                        selectedProfilePhotoPreview
                        ?? (student.profile_photo_url
                          ? resolveBackendAssetUrl(student.profile_photo_url)
                          : undefined)
                      }
                      alt={student.full_name}
                    />
                    <AvatarFallback className="text-lg font-semibold">
                      {getInitials(student.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                </button>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-foreground">{student.full_name}</h2>
                    <Badge variant="outline">{student.roll_number || student.enrollment_number}</Badge>
                    <Badge variant={student.policy_accepted ? 'success' : 'warning'}>
                      {student.policy_accepted ? 'Policy Accepted' : 'Policy Pending'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {student.email}
                    </span>
                    {student.mobile && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        {formatPhoneNumber(student.mobile)}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {student.department} • {student.batch}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground">Profile completion</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{profileCompletion}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">80% needed for interest registration</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground">Live summary</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {resumes.length} resumes • {projects.length} projects • {interests.length} interests
                    </p>
                    {student.policy_accepted_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Policy accepted on {formatDate(student.policy_accepted_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/resumes">
                  Manage Resumes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/policy">View Policy</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-lg border border-border bg-card p-2">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="placement">Placement</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal details
                  </CardTitle>
                  <CardDescription>
                    Update your alternate mobile number and LinkedIn URL here. To change your profile photo,
                    click your photo at the top of this page, or use the file picker section below.
                  </CardDescription>
                </div>
                <Button disabled={updatePersonal.isPending} onClick={handleSavePersonal}>
                  {updatePersonal.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Personal Details
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Lock className="h-4 w-4" />
                <AlertTitle>Profile editing is restricted</AlertTitle>
                <AlertDescription>
                    You can update your alternate phone number, LinkedIn URL, and profile photo here. All other personal fields are read-only.
                </AlertDescription>
              </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <ReadonlyField label="Full Name" value={personalForm.full_name || 'Not provided'} />
                  <ReadonlyField
                    label="Mobile"
                    value={personalForm.mobile ? formatPhoneNumber(personalForm.mobile) : 'Not provided'}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="alternate_phone">Alternate Phone</Label>
                    <Input
                      id="alternate_phone"
                      value={personalForm.alternate_phone}
                      onChange={(event) =>
                        setPersonalForm((current) => ({ ...current, alternate_phone: event.target.value }))
                      }
                      placeholder="+91 98765 43210"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Add a secondary mobile number the placement team can use if needed.
                    </p>
                  </div>
                  <ReadonlyField
                    label="Date of Birth"
                    value={personalForm.date_of_birth || 'Not provided'}
                  />
                  <ReadonlyField label="Gender" value={personalForm.gender || 'Not provided'} />
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={personalForm.linkedin_url}
                      onChange={(event) =>
                        setPersonalForm((current) => ({ ...current, linkedin_url: event.target.value }))
                      }
                      placeholder="https://www.linkedin.com/in/your-profile"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Use a full `https://` LinkedIn profile URL.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="profile_photo">Profile Photo</Label>
                  <Input
                    ref={profilePhotoInputRef}
                    id="profile_photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedProfilePhoto(file);
                      setProfilePhotoDialogOpen(Boolean(file));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a professional photo only. Choose a JPG, PNG, or WEBP image and the preview dialog will open so you can review, crop, and upload it.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ReadonlyTextarea
                    label="Residential Address"
                    value={personalForm.residential_address || 'Not provided'}
                  />
                  <ReadonlyTextarea
                    label="Permanent Address"
                    value={personalForm.permanent_address || 'Not provided'}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Institute-managed fields</CardTitle>
                <CardDescription>
                  These details are maintained by the institute and are shown here for reference only.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <ReadonlyField label="Email" value={student.email} />
                <ReadonlyField label="Enrollment Number" value={student.enrollment_number} />
                <ReadonlyField label="Roll Number" value={student.roll_number || 'Not assigned'} />
                <ReadonlyField label="Department" value={student.department} />
                <ReadonlyField label="Batch" value={student.batch} />
                <ReadonlyField label="Course" value={student.course || 'Not assigned'} />
                <ReadonlyField label="Institute" value={student.institute || 'Not assigned'} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Academic profile
                  </CardTitle>
                  <CardDescription>
                    Academic records are institute-managed and are shown here for reference only.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Alert className="md:col-span-2 xl:col-span-4">
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Academic records are read-only</AlertTitle>
                  <AlertDescription>
                    Contact the institute office if any academic value needs a correction.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="cgpa">CGPA</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={academicForm.cgpa}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({ ...current, cgpa: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenth_percentage">10th Percentage</Label>
                  <Input
                    id="tenth_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={academicForm.tenth_percentage}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        tenth_percentage: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twelfth_percentage">12th Percentage</Label>
                  <Input
                    id="twelfth_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={academicForm.twelfth_percentage}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        twelfth_percentage: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diploma_percentage">Diploma Percentage</Label>
                  <Input
                    id="diploma_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={academicForm.diploma_percentage}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        diploma_percentage: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backlog_count">Backlog Count</Label>
                  <Input
                    id="backlog_count"
                    type="number"
                    min="0"
                    value={academicForm.backlog_count}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        backlog_count: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="active_backlogs">Active Backlogs</Label>
                  <Input
                    id="active_backlogs"
                    type="number"
                    min="0"
                    value={academicForm.active_backlogs}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        active_backlogs: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    type="number"
                    min="1"
                    max="12"
                    value={academicForm.semester}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({ ...current, semester: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_of_study">Year of Study</Label>
                  <Input
                    id="year_of_study"
                    type="number"
                    min="1"
                    max="6"
                    value={academicForm.year_of_study}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        year_of_study: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course_duration">Course Duration</Label>
                  <Input
                    id="course_duration"
                    type="number"
                    min="1"
                    max="6"
                    value={academicForm.course_duration}
                    readOnly
                    className="bg-muted/40"
                    onChange={(event) =>
                      setAcademicForm((current) => ({
                        ...current,
                        course_duration: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 md:col-span-2 xl:col-span-3">
                  <p className="text-sm font-medium text-foreground">Current academic snapshot</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {academic?.cgpa != null ? `CGPA ${formatCGPA(academic.cgpa)}` : 'CGPA not added'}
                    {academic ? ` • Backlogs ${academic.backlog_count}` : ''}
                    {academic?.semester ? ` • Semester ${academic.semester}` : ''}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-4 md:col-span-2 xl:col-span-4">
                  <p className="text-sm font-medium text-foreground">CRM academic details</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ReadonlyField label="Program" value={student.program_name || 'Not available'} />
                    <ReadonlyField label="Admission Year" value={student.admission_year != null ? String(student.admission_year) : 'Not available'} />
                    <ReadonlyField label="Current Semester" value={student.current_semester || 'Not available'} />
                    <ReadonlyField label="Semester CGPA" value={student.current_semester_cgpa != null ? String(student.current_semester_cgpa) : 'Not available'} />
                    <ReadonlyField label="Semester SPI" value={student.current_semester_spi != null ? String(student.current_semester_spi) : 'Not available'} />
                    <ReadonlyField label="Semester CPI" value={student.current_semester_cpi != null ? String(student.current_semester_cpi) : 'Not available'} />
                    <ReadonlyField label="10th Board" value={student.board10 || 'Not available'} />
                    <ReadonlyField label="10th Passing Year" value={student.passing_year10 != null ? String(student.passing_year10) : 'Not available'} />
                    <ReadonlyField label="12th / Diploma Board" value={student.board12_or_diploma || 'Not available'} />
                    <ReadonlyField label="12th / Diploma Passing Year" value={student.passing_year12_or_diploma != null ? String(student.passing_year12_or_diploma) : 'Not available'} />
                    <ReadonlyField label="Exam Form Status" value={student.exam_form_status || 'Not available'} />
                    <ReadonlyField label="Attendance %" value={student.overall_attendance_percentage != null ? String(student.overall_attendance_percentage) : 'Not available'} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Skills and preferences</CardTitle>
                  <CardDescription>
                    Add your skills, interests, and location preferences so opportunities can match you better.
                  </CardDescription>
                </div>
                <Button disabled={updateSkills.isPending} onClick={handleSaveSkills}>
                  {updateSkills.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Skills
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="technical_skills">Technical Skills</Label>
                    <span className="text-xs text-muted-foreground">
                      {parseCommaSeparatedList(skillsForm.technical_skills).length}/{MAX_TECHNICAL_SKILLS}
                    </span>
                  </div>
                  <Textarea
                    id="technical_skills"
                    rows={4}
                    value={skillsForm.technical_skills}
                    onChange={(event) =>
                      setSkillsForm((current) => ({
                        ...current,
                        technical_skills: event.target.value,
                      }))
                      }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use commas to separate each skill. You can select or enter up to {MAX_TECHNICAL_SKILLS} technical skills.
                  </p>
                  <MasterSuggestionChips
                    suggestions={skillMasterValues.data ?? []}
                    selectedValues={parseCommaSeparatedList(skillsForm.technical_skills)}
                    onSelect={(value) => appendSkillSuggestion('technical_skills', value)}
                    onRemove={(value) =>
                      setSkillsForm((current) => ({
                        ...current,
                        technical_skills: removeMasterValueFromCsv(current.technical_skills, value),
                      }))
                    }
                    label="Skill masters"
                    collapsible
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain_interests">Domain Interests</Label>
                  <Textarea
                    id="domain_interests"
                    rows={3}
                    value={skillsForm.domain_interests}
                    onChange={(event) =>
                      setSkillsForm((current) => ({
                        ...current,
                        domain_interests: event.target.value,
                      }))
                    }
                  />
                  <MasterSuggestionChips
                    suggestions={interestMasterValues.data ?? []}
                    selectedValues={parseCommaSeparatedList(skillsForm.domain_interests)}
                    onSelect={(value) => appendSkillSuggestion('domain_interests', value)}
                    onRemove={(value) =>
                      setSkillsForm((current) => ({
                        ...current,
                        domain_interests: removeMasterValueFromCsv(current.domain_interests, value),
                      }))
                    }
                    label="Interest masters"
                    collapsible
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_locations">Preferred Locations</Label>
                  <Textarea
                    id="preferred_locations"
                    rows={3}
                    value={skillsForm.preferred_locations}
                    onChange={(event) =>
                      setSkillsForm((current) => ({
                        ...current,
                        preferred_locations: event.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose from the suggestions below or type your own preferred cities.
                  </p>
                  <MasterSuggestionChips
                    suggestions={locationOptions}
                    selectedValues={parseCommaSeparatedList(skillsForm.preferred_locations)}
                    onSelect={(value) =>
                      setSkillsForm((current) => ({
                        ...current,
                        preferred_locations: appendMasterValueToCsv(current.preferred_locations, value),
                      }))
                    }
                    onRemove={(value) =>
                      setSkillsForm((current) => ({
                        ...current,
                        preferred_locations: removeMasterValueFromCsv(current.preferred_locations, value),
                      }))
                    }
                    label="Location suggestions"
                    collapsible
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    Projects
                  </CardTitle>
                  <CardDescription>
                    Add the projects you want recruiters and the placement team to see.
                  </CardDescription>
                </div>
                <Button onClick={startNewProject}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Project
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectsQuery.error && (
                  <Alert variant="destructive">
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Unable to load projects</AlertTitle>
                    <AlertDescription>{getErrorMessage(projectsQuery.error)}</AlertDescription>
                  </Alert>
                )}

                {showProjectEditor && (
                  <Card className="border-primary/30">
                    <CardHeader>
                    <CardTitle className="text-base">
                        {editingProjectId ? 'Edit Project' : 'Add Project'}
                      </CardTitle>
                      <CardDescription>
                        All fields are required before you can save the project.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="project_title">
                            <RequiredLabel>Title</RequiredLabel>
                          </Label>
                          <Input
                            id="project_title"
                            value={projectDraft.title}
                            onChange={(event) =>
                              setProjectDraft((current) => ({ ...current, title: event.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="project_description">
                            <RequiredLabel>Description</RequiredLabel>
                          </Label>
                          <Textarea
                            id="project_description"
                            rows={4}
                            value={projectDraft.description}
                            onChange={(event) =>
                              setProjectDraft((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="project_technologies">
                            <RequiredLabel>Technologies</RequiredLabel>
                          </Label>
                          <Input
                            id="project_technologies"
                            value={projectDraft.technologies}
                            onChange={(event) =>
                              setProjectDraft((current) => ({
                                ...current,
                                technologies: event.target.value,
                              }))
                            }
                          />
                          <MasterSuggestionChips
                            suggestions={technologyMasterValues.data ?? []}
                            selectedValues={parseCommaSeparatedList(projectDraft.technologies)}
                            onSelect={appendProjectTechnology}
                            onRemove={(value) =>
                              setProjectDraft((current) => ({
                                ...current,
                                technologies: removeMasterValueFromCsv(current.technologies, value),
                              }))
                            }
                            label="Technology masters"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project_start_date">
                            <RequiredLabel>Start Date</RequiredLabel>
                          </Label>
                          <Input
                            id="project_start_date"
                            type="date"
                            max={todayIso}
                            value={projectDraft.start_date}
                            onChange={(event) =>
                              setProjectDraft((current) => ({
                                ...current,
                                start_date: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project_end_date">
                            <RequiredLabel>End Date</RequiredLabel>
                          </Label>
                          <Input
                            id="project_end_date"
                            type="date"
                            disabled={projectDraft.is_ongoing}
                            min={projectDraft.start_date || undefined}
                            max={todayIso}
                            value={projectDraft.end_date}
                            onChange={(event) =>
                              setProjectDraft((current) => ({
                                ...current,
                                end_date: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project_github_url">GitHub URL (optional)</Label>
                          <Input
                            id="project_github_url"
                            type="url"
                            value={projectDraft.github_url}
                            onChange={(event) =>
                              setProjectDraft((current) => ({
                                ...current,
                                github_url: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project_demo_url">Demo URL (optional)</Label>
                          <Input
                            id="project_demo_url"
                            type="url"
                            value={projectDraft.demo_url}
                            onChange={(event) =>
                              setProjectDraft((current) => ({
                                ...current,
                                demo_url: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-3">
                        <div className="space-y-1">
                          <Label htmlFor="project_is_ongoing" className="text-sm font-medium">
                            This project is ongoing
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Enable this if the project has no end date yet.
                          </p>
                        </div>
                        <Switch
                          id="project_is_ongoing"
                          checked={projectDraft.is_ongoing}
                          onCheckedChange={(checked) =>
                            setProjectDraft((current) => ({
                              ...current,
                              is_ongoing: checked,
                              end_date: checked ? '' : current.end_date,
                            }))
                          }
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button disabled={isProjectSaving} onClick={handleSaveProject}>
                          {isProjectSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {editingProjectId ? 'Update Project' : 'Create Project'}
                        </Button>
                        <Button variant="outline" onClick={closeProjectEditor}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {projectsQuery.isLoading ? (
                  <Skeleton className="h-32 w-full bg-muted" />
                ) : projects.length === 0 ? (
                  <EmptyState
                    icon={FolderKanban}
                    title="No projects added"
                    description="Add a project to strengthen your profile and improve your placement readiness."
                    actionLabel="Add Project"
                    onAction={startNewProject}
                  />
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <Card key={project.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-foreground">{project.title}</h3>
                                {project.is_ongoing && <Badge variant="info">Ongoing</Badge>}
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                              )}
                              {project.role && (
                                <p className="text-sm text-muted-foreground">{project.role}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {project.technologies.map((technology) => (
                                  <Badge key={technology} variant="secondary">
                                    {technology}
                                  </Badge>
                                ))}
                              </div>
                              {project.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {project.keywords.map((keyword) => (
                                    <Badge key={keyword} variant="outline" className="text-xs">
                                      <Tag className="mr-1 h-3 w-3" />
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {project.start_date && <span>Started {formatDate(project.start_date)}</span>}
                                {project.end_date && !project.is_ongoing && (
                                  <span>Ended {formatDate(project.end_date)}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm">
                                {project.github_url && (
                                  <a
                                    href={project.github_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    GitHub
                                  </a>
                                )}
                                {project.demo_url && (
                                  <a
                                    href={project.demo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Demo
                                  </a>
                                )}
                                {project.live_url && (
                                  <a
                                    href={project.live_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Live
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingProject(project)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deleteProject.isPending}
                                onClick={() => handleDeleteProject(project.id, project.title)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certifications">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Certifications
                  </CardTitle>
                  <CardDescription>
                    Add certifications to highlight your learning and achievements.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCertificationForm((current) => !current)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {showCertificationForm ? 'Close Form' : 'Add Certification'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {certificationsQuery.error && (
                  <Alert variant="destructive">
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Unable to load certifications</AlertTitle>
                    <AlertDescription>{getErrorMessage(certificationsQuery.error)}</AlertDescription>
                  </Alert>
                )}

                {showCertificationForm && (
                  <Card className="border-primary/30">
                    <CardHeader>
                      <CardTitle className="text-base">Add Certification</CardTitle>
                      <CardDescription>
                        Name and issuer are required. If you need to make a correction later, delete the record and add it again.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="cert_name">
                          <RequiredLabel>Certification Name</RequiredLabel>
                        </Label>
                        <Input
                          id="cert_name"
                          value={certificationDraft.name}
                          onChange={(event) =>
                            setCertificationDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cert_issuer">
                          <RequiredLabel>Issuer</RequiredLabel>
                        </Label>
                        <Input
                          id="cert_issuer"
                          value={certificationDraft.issuer}
                          onChange={(event) =>
                            setCertificationDraft((current) => ({
                              ...current,
                              issuer: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cert_issue_date">Issue Date</Label>
                        <Input
                          id="cert_issue_date"
                          type="date"
                          max={todayIso}
                          value={certificationDraft.issue_date}
                          onChange={(event) =>
                            setCertificationDraft((current) => ({
                              ...current,
                              issue_date: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="cert_credential_url">Credential URL</Label>
                        <Input
                          id="cert_credential_url"
                          type="url"
                          value={certificationDraft.credential_url}
                          onChange={(event) =>
                            setCertificationDraft((current) => ({
                              ...current,
                              credential_url: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="cert_document">
                          <RequiredLabel>Supporting Document</RequiredLabel>
                        </Label>
                        <Input
                          ref={certificationDocumentInputRef}
                          id="cert_document"
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(event) => setSelectedCertificationDocument(event.target.files?.[0] ?? null)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload a supporting document for this certification. PDF files only.
                        </p>
                        {selectedCertificationDocument ? (
                          <p className="text-xs text-muted-foreground">
                            Ready to upload: {selectedCertificationDocument.name}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3 md:col-span-2">
                        <Button
                          disabled={createCertification.isPending || uploadCertificationDocument.isPending}
                          onClick={handleAddCertification}
                        >
                          {createCertification.isPending || uploadCertificationDocument.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileUp className="mr-2 h-4 w-4" />
                          )}
                          Add Certification
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedCertificationDocument(null);
                            setShowCertificationForm(false);
                            if (certificationDocumentInputRef.current) {
                              certificationDocumentInputRef.current.value = '';
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {certificationsQuery.isLoading ? (
                  <Skeleton className="h-32 w-full bg-muted" />
                ) : certifications.length === 0 ? (
                  <EmptyState
                    icon={Award}
                    title="No certifications added"
                    description="Certifications help complete the student profile and showcase additional credibility."
                    actionLabel="Add Certification"
                    onAction={() => setShowCertificationForm(true)}
                  />
                ) : (
                  <div className="space-y-4">
                    {certifications.map((certification) => (
                      <Card key={certification.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-foreground">{certification.name}</h3>
                                <Badge variant="secondary">{certification.issuer}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {certification.issue_date
                                  ? `Issued on ${formatDate(certification.issue_date)}`
                                  : 'Issue date not provided'}
                              </p>
                              {certification.credential_url && (
                                <a
                                  href={certification.credential_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View credential
                                </a>
                              )}
                              {certification.document_url && (
                                <a
                                  href={resolveBackendAssetUrl(certification.document_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {certification.document_name || 'View supporting document'}
                                </a>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deleteCertification.isPending}
                              onClick={() => handleDeleteCertification(certification.id, certification.name)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <StudentEmploymentTab />
          </TabsContent>

          <TabsContent value="placement">
            <StudentPlacementTab />
          </TabsContent>

          <TabsContent value="policies">
            <StudentPoliciesTab />
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Password change
                </CardTitle>
                <CardDescription>
                  Update your password from the profile screen. We will revoke other sessions after the change.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">
                      <RequiredLabel>Current Password</RequiredLabel>
                    </Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, current_password: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">
                      <RequiredLabel>New Password</RequiredLabel>
                    </Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, new_password: event.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="confirm_new_password">
                      <RequiredLabel>Confirm New Password</RequiredLabel>
                    </Label>
                    <Input
                      id="confirm_new_password"
                      type="password"
                      value={passwordForm.confirm_new_password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, confirm_new_password: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handleChangePassword}>
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Profile overview</CardTitle>
            <CardDescription>
              A quick snapshot of the sections you have completed so far.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Resumes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {resumes.length > 0 ? `${resumes.length} uploaded` : 'No resumes uploaded'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Interests</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {interests.length > 0 ? (
                  interests.map((interest) => (
                    <Badge key={interest.id} variant="secondary">
                      {formatInterestLabel(interest.interest_type)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No interests registered yet</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Policy</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.policy_accepted ? 'Accepted' : 'Pending acceptance'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Academic status</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {academic?.cgpa != null ? `CGPA ${formatCGPA(academic.cgpa)}` : 'Academic data pending'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={profilePhotoDialogOpen}
          onOpenChange={(open) => {
            setProfilePhotoDialogOpen(open);
            if (!open) {
              setSelectedProfilePhoto(null);
              if (profilePhotoInputRef.current) {
                profilePhotoInputRef.current.value = '';
              }
            }
          }}
        >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview Profile Photo</DialogTitle>
            <DialogDescription>
              Review the selected image, adjust the crop box if needed, then upload it.
            </DialogDescription>
          </DialogHeader>

          {selectedProfilePhotoPreview && selectedProfilePhoto ? (
            <ProfilePhotoCropper
              file={selectedProfilePhoto}
              imageUrl={selectedProfilePhotoPreview}
              onApplyCrop={handleApplyProfilePhotoCrop}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No photo selected.
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              disabled={!selectedProfilePhoto || uploadProfilePhoto.isPending}
                onClick={handleUploadProfilePhoto}
              >
                {uploadProfilePhoto.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfilePhotoDialogOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmActionDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={deleteTarget?.type === 'project' ? 'Delete project?' : 'Delete certification?'}
          description={`This will permanently remove "${deleteTargetLabel}" from your profile.`}
          confirmLabel={deleteTarget?.type === 'project' ? 'Delete Project' : 'Delete Certification'}
          confirmVariant="destructive"
          isPending={deleteProject.isPending || deleteCertification.isPending}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}
