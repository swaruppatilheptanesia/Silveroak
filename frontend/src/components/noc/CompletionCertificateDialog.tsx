import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubmitCompletionCertificate } from '@/hooks/use-noc-api';
import { formatApiErrorMessage } from '@/lib/apiError';

interface CompletionCertificateDialogProps {
  nocId: string;
  companyName: string;
  /** True when the student is replacing a previously rejected certificate. */
  isResubmit?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_MB = 10;

/**
 * Student upload dialog for the internship completion certificate (PDF). Uploads and attaches in one
 * call, moving the NOC's completion status to Pending review. Reused by the card and the detail sheet.
 */
export function CompletionCertificateDialog({
  nocId,
  companyName,
  isResubmit = false,
  open,
  onOpenChange,
}: CompletionCertificateDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const submitMutation = useSubmitCompletionCertificate();

  function reset() {
    setFile(null);
  }

  async function handleSubmit() {
    if (!file) {
      toast.error('Please choose a PDF file to upload.');
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File must be ${MAX_FILE_MB} MB or smaller.`);
      return;
    }
    try {
      await submitMutation.mutateAsync({ nocId, file });
      toast.success('Completion certificate submitted for review.');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to submit the completion certificate.'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isResubmit ? 'Re-upload Completion Certificate' : 'Upload Completion Certificate'}</DialogTitle>
          <DialogDescription>
            Upload the internship completion certificate for {companyName} (PDF only). It will be sent to the
            TPO cell for verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="completion-certificate-file">Completion Certificate (PDF)</Label>
          <Input
            id="completion-certificate-file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file ? <p className="text-xs text-muted-foreground">Ready to upload: {file.name}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitMutation.isPending || !file} className="gap-2">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
