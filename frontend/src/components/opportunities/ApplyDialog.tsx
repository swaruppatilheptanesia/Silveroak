import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApplyToPosting } from '@/hooks/use-application-api';
import { useStudentResumes } from '@/hooks/use-student-api';
import { Send, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

interface ApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postingId: string;
  opportunityTitle: string;
  companyName: string;
  onApplied?: () => void;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function ApplyDialog({ 
  open, 
  onOpenChange, 
  postingId,
  opportunityTitle, 
  companyName,
  onApplied,
}: ApplyDialogProps) {
  const resumesQuery = useStudentResumes();
  const applyToPosting = useApplyToPosting();
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [confirmations, setConfirmations] = useState({
    accuracy: false,
    availability: false,
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const resumes = useMemo(() => resumesQuery.data ?? [], [resumesQuery.data]);
  const defaultResumeId = useMemo(
    () => resumes.find((resume) => resume.is_default)?.id ?? resumes[0]?.id ?? '',
    [resumes]
  );
  const allConfirmed = Object.values(confirmations).every(Boolean);
  const canSubmit = Boolean(selectedResume) && allConfirmed && resumes.length > 0;

  function resetState() {
    setIsSubmitted(false);
    setSelectedResume('');
    setConfirmations({ accuracy: false, availability: false, terms: false });
  }

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (!selectedResume && defaultResumeId) {
      setSelectedResume(defaultResumeId);
    }
  }, [defaultResumeId, open, selectedResume]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    try {
      await applyToPosting.mutateAsync({
        posting_id: postingId,
        resume_id: selectedResume,
      });
      setIsSubmitted(true);
      onApplied?.();
      toast.success('Application submitted successfully.');

      window.setTimeout(() => {
        onOpenChange(false);
      }, 1800);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to submit application.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetState();
      onOpenChange(false);
    }
  };

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Application Submitted!</h3>
            <p className="text-muted-foreground mt-2">
              Your application for <strong>{opportunityTitle}</strong> at <strong>{companyName}</strong> has been submitted successfully.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              You can track your application status in the "My Applications" section.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Apply for Position
          </DialogTitle>
          <DialogDescription>
            {opportunityTitle} at {companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resume Selection */}
          <div className="space-y-3">
            <Label>Select Resume *</Label>
            {resumesQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resumes...
              </div>
            ) : resumesQuery.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Unable to load resumes</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(resumesQuery.error, 'Please refresh and try again.')}
                </AlertDescription>
              </Alert>
            ) : resumes.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No resume uploaded yet</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <span>Upload at least one resume before applying for this opportunity.</span>
                  <div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/resumes">Manage resumes</Link>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedResume} onValueChange={setSelectedResume}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resume to submit" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.name}{resume.is_default ? ' • Default' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Confirmations */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-accent/30">
            <Label className="text-sm font-medium">Please confirm the following:</Label>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="accuracy"
                checked={confirmations.accuracy}
                onCheckedChange={(checked) => 
                  setConfirmations(prev => ({ ...prev, accuracy: !!checked }))
                }
              />
              <Label htmlFor="accuracy" className="text-sm font-normal cursor-pointer leading-relaxed">
                I confirm that all information in my profile and resume is accurate and up-to-date.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="availability"
                checked={confirmations.availability}
                onCheckedChange={(checked) => 
                  setConfirmations(prev => ({ ...prev, availability: !!checked }))
                }
              />
              <Label htmlFor="availability" className="text-sm font-normal cursor-pointer leading-relaxed">
                I will be available for the selection process as per the company's schedule.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={confirmations.terms}
                onCheckedChange={(checked) => 
                  setConfirmations(prev => ({ ...prev, terms: !!checked }))
                }
              />
              <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                I agree to the placement policy and understand that my application may be shared with the recruiting company.
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting || resumesQuery.isLoading || Boolean(resumesQuery.error)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
