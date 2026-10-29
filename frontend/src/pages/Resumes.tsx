import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import {
  AlertCircle,
  Download,
  Eye,
  FileText,
  HardDrive,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteResume,
  useSetDefaultResume,
  useStudentResumes,
  useUpdateResume,
  useUploadResume,
} from '@/hooks/use-student-api';
import { formatDate, formatFileSize } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiResume } from '@/types/student';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function ResumeSkeleton() {
  return (
    <DashboardLayout
      title="Resume Manager"
      subtitle="Loading your uploaded resumes"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48 bg-muted" />
              <Skeleton className="h-4 w-72 bg-muted" />
              <Skeleton className="h-10 w-36 bg-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full bg-muted" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** A human error for a picked resume file, or null when it's a PDF within the size limit. */
function resumeFileProblem(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Only PDF files are allowed.';
  if (file.size > MAX_RESUME_BYTES) return 'Resume must be 5 MB or smaller.';
  return null;
}

function openAsset(url: string, filename?: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  if (filename) {
    anchor.download = filename;
  }
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function ResumeCard({
  resume,
  onPreview,
  onDownload,
  onSetDefault,
  onUpdate,
  onDelete,
  isBusy,
  isUpdating,
}: {
  resume: ApiResume;
  onPreview: (resume: ApiResume) => void;
  onDownload: (resume: ApiResume) => void;
  onSetDefault: (resume: ApiResume) => void;
  onUpdate: (resume: ApiResume) => void;
  onDelete: (resume: ApiResume) => void;
  isBusy: boolean;
  isUpdating: boolean;
}) {
  const usedIn = resume.application_count ?? 0;
  return (
    <Card className={resume.is_default ? 'border-primary' : undefined}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="rounded-lg bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{resume.name}</h3>
                  {resume.is_default && <Badge variant="success">Default</Badge>}
                  <Badge variant="outline">{resume.mime_type.replace('application/', '').toUpperCase()}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Uploaded {formatDate(resume.uploaded_at)}</span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    {formatFileSize(resume.file_size)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onPreview(resume)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDownload(resume)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              {!resume.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onSetDefault(resume)}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Set Default
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={isBusy} onClick={() => onUpdate(resume)}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
              {usedIn === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isBusy}
                  onClick={() => onDelete(resume)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            {usedIn > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Used in {usedIn} application{usedIn === 1 ? '' : 's'} — it can be updated with a new file but not deleted.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Resumes() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updateInputRef = useRef<HTMLInputElement | null>(null);
  const resumesQuery = useStudentResumes();
  const uploadResume = useUploadResume();
  const updateResume = useUpdateResume();
  const [updateTarget, setUpdateTarget] = useState<ApiResume | null>(null);
  const setDefaultResume = useSetDefaultResume();
  const deleteResume = useDeleteResume();
  const [deleteTarget, setDeleteTarget] = useState<ApiResume | null>(null);

  if (resumesQuery.isLoading) {
    return <ResumeSkeleton />;
  }

  if (resumesQuery.error) {
    return (
      <DashboardLayout
        title="Resume Manager"
        subtitle="Your resume library could not be loaded"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load resumes</AlertTitle>
          <AlertDescription>
            {getErrorMessage(resumesQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const resumes = resumesQuery.data ?? [];
  const isBusy =
    uploadResume.isPending ||
    updateResume.isPending ||
    setDefaultResume.isPending ||
    deleteResume.isPending;
  const uploadLimitReached = resumes.length >= 5;

  async function handleSelectedFile(file: File | undefined) {
    if (!file) return;

    const problem = resumeFileProblem(file);
    if (problem) {
      toast.error(problem);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      await uploadResume.mutateAsync({ file, name: file.name.replace(/\.[^/.]+$/, '') || file.name });
      toast.success('Resume uploaded successfully.');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Upload failed.'));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleUpdate(resume: ApiResume) {
    setUpdateTarget(resume);
    updateInputRef.current?.click();
  }

  /** Replace the target resume's file — same id, so applications using it keep a valid link. */
  async function handleUpdateFile(file: File | undefined) {
    const target = updateTarget;
    if (updateInputRef.current) updateInputRef.current.value = '';
    if (!file || !target) return;
    const problem = resumeFileProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await updateResume.mutateAsync({ resumeId: target.id, file });
      toast.success(
        (target.application_count ?? 0) > 0
          ? `${target.name} updated — applications using it now see the new file.`
          : `${target.name} updated.`,
      );
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the resume.'));
    } finally {
      setUpdateTarget(null);
    }
  }

  async function handleSetDefault(resume: ApiResume) {
    try {
      await setDefaultResume.mutateAsync(resume.id);
      toast.success(`${resume.name} is now your default resume.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the default resume.'));
    }
  }

  async function handleDelete(resume: ApiResume) {
    setDeleteTarget(resume);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      await deleteResume.mutateAsync(deleteTarget.id);
      toast.success('Resume deleted.');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to delete the resume.'));
    }
  }

  function handlePreview(resume: ApiResume) {
    openAsset(resolveBackendAssetUrl(resume.file_url));
  }

  function handleDownload(resume: ApiResume) {
    openAsset(resolveBackendAssetUrl(resume.file_url), resume.name);
  }

  return (
    <DashboardLayout
      title="Resume Manager"
      subtitle="Upload, review, and manage the resumes used for student applications"
    >
      <div className="space-y-6">
        <Card className="border-dashed border-2">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">Upload a new resume</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Upload a PDF file up to 5 MB. Your first resume becomes default automatically, and you can store up to five resumes.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button
                  disabled={uploadLimitReached || uploadResume.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadResume.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploadResume.isPending ? 'Uploading...' : 'Choose Resume'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="application/pdf,.pdf"
                  onChange={(event) => handleSelectedFile(event.target.files?.[0])}
                />
                <input
                  ref={updateInputRef}
                  type="file"
                  className="hidden"
                  accept="application/pdf,.pdf"
                  onChange={(event) => handleUpdateFile(event.target.files?.[0])}
                />
                <Badge variant={uploadLimitReached ? 'warning' : 'outline'}>
                  {resumes.length}/5 uploaded
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {uploadLimitReached && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload limit reached</AlertTitle>
            <AlertDescription>
              Update one of your existing resumes with the new file, or delete one that isn't used in any application.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Resumes</CardTitle>
            <CardDescription>
              These are the resumes you can use while applying for opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resumes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No resumes uploaded"
                description="Upload your first resume to start using it in applications."
                actionLabel="Upload Resume"
                onAction={() => fileInputRef.current?.click()}
              />
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onSetDefault={handleSetDefault}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isBusy={isBusy}
                    isUpdating={updateResume.isPending && updateTarget?.id === resume.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Resume tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Your uploaded resumes appear here as soon as the upload finishes.</p>
            <p>You can mark one resume as your default version for quicker selection later.</p>
            <p>Use Update to replace a resume with a newer file — it keeps the same resume, so applications that used it stay linked.</p>
            <p>A resume used in an application can't be deleted. If you delete your default resume, another uploaded resume becomes the default automatically.</p>
          </CardContent>
        </Card>

        <ConfirmActionDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={`Delete "${deleteTarget?.name ?? 'resume'}"?`}
          description="If this is your default resume, another uploaded resume will be set as default automatically."
          confirmLabel="Delete Resume"
          confirmVariant="destructive"
          isPending={deleteResume.isPending}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}
