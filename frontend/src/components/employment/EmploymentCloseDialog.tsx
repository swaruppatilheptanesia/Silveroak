import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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

/**
 * Close-employment dialog. The completion-proof document is MANDATORY — confirm stays disabled
 * until a file is chosen (the server also rejects a close with no file).
 */
export function EmploymentCloseDialog({
  open,
  onOpenChange,
  companyName,
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  isPending?: boolean;
  onConfirm: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close employment{companyName ? ` at ${companyName}` : ''}?</DialogTitle>
          <DialogDescription>
            Upload a completion proof document (experience / relieving letter). This is required and the
            entry becomes read-only once closed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="employment_completion_proof">
            Completion proof <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={inputRef}
            id="employment_completion_proof"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">PDF files only.</p>
          {file ? <p className="text-xs text-muted-foreground">Ready to upload: {file.name}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" disabled={!file || isPending} onClick={() => file && onConfirm(file)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Close employment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
