import { useState } from 'react';
import { Check, Copy, KeyRound, ShieldAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TemporaryPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string | null;
  userLabel?: string;
}

export function TemporaryPasswordDialog({
  open,
  onOpenChange,
  password,
  userLabel,
}: TemporaryPasswordDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({ title: 'Password copied', description: 'Paste it into your message before closing.' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Please copy the password manually.',
        variant: 'destructive',
      });
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Temporary password
          </AlertDialogTitle>
          <AlertDialogDescription>
            {userLabel
              ? `A new password has been generated for ${userLabel}.`
              : 'A new password has been generated.'}{' '}
            Share it with the recruiter securely (WhatsApp, phone) — we cannot retrieve it later.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted p-3 font-mono text-sm">
            <span className="select-all break-all">{password ?? '—'}</span>
            <Button size="sm" variant="outline" onClick={() => void handleCopy()} disabled={!password}>
              {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/60 p-3 text-sm dark:bg-amber-500/5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-foreground">
              This password is shown only once. If you close this dialog without saving it, you'll have
              to regenerate from the user management screen.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>I've saved it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
