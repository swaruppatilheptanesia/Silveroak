import { useEffect, useState } from 'react';
import { Loader2, Lock, Shield, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateStudentProfileBlock } from '@/hooks/use-admin-api';
import type { ApiAdminStudent } from '@/types/admin';

interface StudentProfileBlockSectionProps {
  studentId: string;
  profileBlocked: boolean;
  profileBlockReason: string | null;
  studentName?: string;
  onUpdatedStudent?: (student: ApiAdminStudent) => void;
}

export function StudentProfileBlockSection({
  studentId,
  profileBlocked,
  profileBlockReason,
  studentName,
  onUpdatedStudent,
}: StudentProfileBlockSectionProps) {
  const [reason, setReason] = useState(profileBlockReason ?? '');
  const updateBlock = useUpdateStudentProfileBlock();

  useEffect(() => {
    setReason(profileBlockReason ?? '');
  }, [profileBlockReason, profileBlocked, studentId]);

  const handleBlock = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error('Please enter a reason before blocking the profile.');
      return;
    }

    try {
      const updated = await updateBlock.mutateAsync({
        studentId,
        data: {
          profile_blocked: true,
          reason: trimmedReason,
        },
      });
      onUpdatedStudent?.(updated);
      toast.success(`${studentName ? `${studentName}'s` : 'Student'} profile blocked.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to block the student profile.');
    }
  };

  const handleUnblock = async () => {
    try {
      const updated = await updateBlock.mutateAsync({
        studentId,
        data: {
          profile_blocked: false,
          reason: null,
        },
      });
      onUpdatedStudent?.(updated);
      toast.success(`${studentName ? `${studentName}'s` : 'Student'} profile unblocked.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to unblock the student profile.');
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Profile Access
          </CardTitle>
          <Badge variant={profileBlocked ? 'destructive' : 'success'}>
            {profileBlocked ? 'Blocked' : 'Active'}
          </Badge>
        </div>
        <CardDescription>
          Blocked students still log in, but they only see the blocking message until the profile is unblocked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profileBlocked ? (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertTitle>Profile blocked</AlertTitle>
            <AlertDescription>
              {profileBlockReason || 'No reason recorded.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`block_reason_${studentId}`}>
              Block reason
            </label>
            <Textarea
              id={`block_reason_${studentId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this student profile should be blocked"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This note will be shown to T&P staff internally. It is required before blocking the profile.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {profileBlocked ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleUnblock}
              disabled={updateBlock.isPending}
            >
              {updateBlock.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              Unblock Profile
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleBlock}
              disabled={updateBlock.isPending || !reason.trim()}
            >
              {updateBlock.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Block Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
