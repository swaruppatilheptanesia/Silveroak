import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Save,
  ShieldAlert,
  User,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecruiterDashboard, useUpdateRecruiterProfile } from '@/hooks/use-recruiter-api';
import { formatRecruiterPhone, getRecruiterVerificationLabel } from '@/lib/employerModule';
import { useToast } from '@/hooks/use-toast';
import type { RecruiterVerificationStatus } from '@/types/recruiter';

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/u, 'Enter a valid phone number')
    .or(z.literal('')),
  designation: z.string().trim().min(1, 'Designation is required').max(100, 'Designation must be under 100 characters'),
});

type RecruiterProfileFormState = z.infer<typeof profileSchema>;

function getErrorMessage(error: unknown, fallback = 'Unable to load recruiter profile.') {
  return error instanceof Error ? error.message : fallback;
}

function getVerificationBadge(status: RecruiterVerificationStatus) {
  if (status === 'verified') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <ShieldAlert className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-yellow-600 text-yellow-600">
      <Clock className="mr-1 h-3 w-3" />
      {getRecruiterVerificationLabel(status)}
    </Badge>
  );
}

function RecruiterProfileSkeleton() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-10 w-56 bg-muted" />
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    </DashboardLayout>
  );
}

export default function RecruiterProfile() {
  const { toast } = useToast();
  const dashboardQuery = useRecruiterDashboard();
  const updateProfile = useUpdateRecruiterProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<RecruiterProfileFormState>({
    phone: '',
    designation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!dashboardQuery.data) return;

    setFormData({
      phone: dashboardQuery.data.recruiter.phone ?? '',
      designation: dashboardQuery.data.recruiter.designation ?? '',
    });
  }, [dashboardQuery.data]);

  function validate() {
    const result = profileSchema.safeParse(formData);

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.errors) {
      const field = issue.path[0];
      if (typeof field === 'string') {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }

  async function handleSave() {
    if (!validate()) return;

    try {
      await updateProfile.mutateAsync({
        phone: formData.phone.trim() || null,
        designation: formData.designation.trim() || null,
      });

      toast({
        title: 'Profile updated',
        description: 'Your recruiter contact details have been updated.',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Unable to update profile',
        description: getErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  }

  if (dashboardQuery.isLoading) {
    return <RecruiterProfileSkeleton />;
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <User className="h-4 w-4" />
          <AlertTitle>Unable to load recruiter profile</AlertTitle>
          <AlertDescription>{getErrorMessage(dashboardQuery.error)}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { recruiter, company } = dashboardQuery.data;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your recruiter profile and contact details.</p>
        </div>

        {recruiter.verification_status !== 'verified' ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Verification in progress</AlertTitle>
            <AlertDescription>
              Your profile is currently {getRecruiterVerificationLabel(recruiter.verification_status).toLowerCase()}.
              You can still update your contact information here.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-semibold text-primary">
                    {recruiter.name
                      .split(' ')
                      .map((part) => part[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <CardTitle>{recruiter.name}</CardTitle>
                  <CardDescription>{recruiter.designation || 'No designation'}</CardDescription>
                </div>
              </div>
              {getVerificationBadge(recruiter.verification_status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{recruiter.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="font-medium">{recruiter.email}</p>
                    <p className="text-xs text-muted-foreground">Email changes require TPO admin support.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{company.name}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium">Editable Details</h3>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recruiter-profile-phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="recruiter-profile-phone"
                          value={formData.phone}
                          onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                          className={errors.phone ? 'border-destructive' : ''}
                          placeholder="+91 9876543210"
                        />
                        {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
                      </>
                    ) : (
                      <p className="p-2 text-sm">{formatRecruiterPhone(recruiter.phone)}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recruiter-profile-designation" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Designation
                    </Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="recruiter-profile-designation"
                          value={formData.designation}
                          onChange={(event) => setFormData((current) => ({ ...current, designation: event.target.value }))}
                          className={errors.designation ? 'border-destructive' : ''}
                          placeholder="HR Manager"
                        />
                        {errors.designation ? <p className="text-sm text-destructive">{errors.designation}</p> : null}
                      </>
                    ) : (
                      <p className="p-2 text-sm">{recruiter.designation || 'No designation'}</p>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          phone: recruiter.phone ?? '',
                          designation: recruiter.designation ?? '',
                        });
                        setErrors({});
                      }}
                      disabled={updateProfile.isPending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={updateProfile.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Only your phone number and designation are editable from the recruiter portal. Contact the placement office for identity, email, or company mapping changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
