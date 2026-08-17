import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';
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
import { authService } from '@/services/authService';
import { formatApiErrorMessage } from '@/lib/apiError';
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from '@/lib/passwordPolicy';

const emptyForm = {
  current_password: '',
  new_password: '',
  confirm_new_password: '',
};

/**
 * Reusable change-password dialog. Mirrors the validation from the profile Security tab and
 * calls authService.changePassword (PUT /auth/me/password). Closes only via Cancel/X
 * (Dialog is patched to ignore overlay/Escape — see CLAUDE.md modal convention).
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function close() {
    setForm(emptyForm);
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!form.current_password.trim() || !form.new_password.trim()) {
      toast.error('Current and new password are required.');
      return;
    }
    const policyError = getPasswordPolicyError(form.new_password);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    if (form.new_password !== form.confirm_new_password) {
      toast.error('New password and confirmation must match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
        confirm_new_password: form.confirm_new_password,
      });
      toast.success('Your password has been updated.');
      close();
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to change password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change password
          </DialogTitle>
          <DialogDescription>
            Update your password. Other active sessions may be revoked after the change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpd_current_password">Current Password</Label>
            <Input
              id="cpd_current_password"
              type="password"
              autoComplete="current-password"
              value={form.current_password}
              onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpd_new_password">New Password</Label>
            <Input
              id="cpd_new_password"
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))}
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpd_confirm_new_password">Confirm New Password</Label>
            <Input
              id="cpd_confirm_new_password"
              type="password"
              autoComplete="new-password"
              value={form.confirm_new_password}
              onChange={(event) => setForm((current) => ({ ...current, confirm_new_password: event.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            {isSubmitting ? 'Updating...' : 'Change Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
