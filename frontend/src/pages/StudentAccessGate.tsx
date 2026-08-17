import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Shield, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfilePhotoCropper } from '@/components/profile/ProfilePhotoCropper';
import { useStudentProfile, useUploadStudentProfilePhoto } from '@/hooks/use-student-api';
import { resolveBackendAssetUrl } from '@/lib/studentModule';

type StudentAccessLocationState = {
  from?: string;
};

export default function StudentAccessGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as StudentAccessLocationState | null;
  const profileQuery = useStudentProfile();
  const uploadProfilePhoto = useUploadStudentProfilePhoto();
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<File | null>(null);
  const [selectedProfilePhotoPreview, setSelectedProfilePhotoPreview] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const student = profileQuery.data?.student;

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
    if (student && !student.profile_blocked && student.profile_photo_url) {
      navigate(locationState?.from && locationState.from !== '/student/access' ? locationState.from : '/', {
        replace: true,
      });
    }
  }, [locationState?.from, navigate, student]);

  async function handleUploadProfilePhoto() {
    if (!selectedProfilePhoto) {
      toast.error('Choose a profile photo first.');
      return;
    }

    try {
      await uploadProfilePhoto.mutateAsync(selectedProfilePhoto);
      setSelectedProfilePhoto(null);
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = '';
      }
      navigate(locationState?.from && locationState.from !== '/student/access' ? locationState.from : '/', {
        replace: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload profile photo.');
    }
  }

  const isBlocked = Boolean(student?.profile_blocked);
  const blockedReason = student?.profile_block_reason?.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-8 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
        <Card className="w-full border-white/10 bg-white/5 text-slate-50 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl text-white">Student Access</CardTitle>
                <CardDescription className="text-slate-300">
                  Your profile must be complete before you can continue using the student portal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {profileQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-300">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg font-medium text-white">Checking your profile status</p>
                <p className="max-w-md text-sm">
                  Please wait while we confirm whether your profile is blocked or missing a required photo.
                </p>
              </div>
            ) : isBlocked ? (
              <div className="space-y-4">
                <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-red-100">
                  <Lock className="h-4 w-4" />
                  <AlertTitle className="text-red-50">Your Profile is Blocked</AlertTitle>
                  <AlertDescription className="text-red-100">
                    {blockedReason || 'Kindly visit T&P Cell to unblock your profile.'}
                  </AlertDescription>
                </Alert>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Blocked</Badge>
                    <span className="font-medium">Access is restricted</span>
                  </div>
                  <p className="mt-3 leading-6 text-slate-300">
                    Your student profile cannot be used until the T&P Cell removes the block. Profile photo upload and other student actions are disabled.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-50">
                  <Upload className="h-4 w-4" />
                  <AlertTitle className="text-amber-50">Profile photo required</AlertTitle>
                  <AlertDescription className="text-amber-100">
                    Upload a professional photo to continue. You will not be able to use the student portal until the photo is added.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="student_profile_photo_gate" className="text-white">
                    Profile Photo
                  </Label>
                  <Input
                    ref={profilePhotoInputRef}
                    id="student_profile_photo_gate"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="border-white/10 bg-white/5 text-slate-100 file:border-0 file:bg-primary file:text-primary-foreground file:font-medium"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedProfilePhoto(file);
                    }}
                  />
                  <p className="text-xs text-slate-300">
                    Add professional photo only. JPG, PNG, or WEBP images are accepted.
                  </p>
                </div>

                {selectedProfilePhoto && selectedProfilePhotoPreview ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <ProfilePhotoCropper
                      file={selectedProfilePhoto}
                      imageUrl={selectedProfilePhotoPreview}
                      onApplyCrop={setSelectedProfilePhoto}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-300">
                    Choose a photo to open the cropper and continue.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={!selectedProfilePhoto || uploadProfilePhoto.isPending}
                    onClick={handleUploadProfilePhoto}
                  >
                    {uploadProfilePhoto.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setSelectedProfilePhoto(null);
                      if (profilePhotoInputRef.current) {
                        profilePhotoInputRef.current.value = '';
                      }
                    }}
                  >
                    Reset Selection
                  </Button>
                </div>

                {student?.profile_photo_url ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    Current photo already exists at{' '}
                    <a
                      href={resolveBackendAssetUrl(student.profile_photo_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline underline-offset-4"
                    >
                      this link
                    </a>
                    .
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
