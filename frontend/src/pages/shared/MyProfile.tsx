import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  Bell,
  BellOff,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  User,
} from 'lucide-react';
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from '@/lib/passwordPolicy';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatApiErrorMessage } from '@/lib/apiError';
import { formatDateTime, getInitials } from '@/lib/formatters';
import { authService, type UpdateMeRequest } from '@/services/authService';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notification-api';
import {
  NOTIFICATION_CATEGORY_META,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationPreference,
  type NotificationType,
} from '@/types/notification';

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/u, 'Enter a valid phone number')
    .or(z.literal('')),
  designation: z
    .string()
    .trim()
    .min(1, 'Designation is required')
    .max(100, 'Designation must be 100 characters or less'),
});

type ProfileFormState = z.infer<typeof profileSchema>;

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

const emptyPasswordForm: PasswordFormState = {
  current_password: '',
  new_password: '',
  confirm_new_password: '',
};

interface MyProfileProps {
  roleLabel: string;
  /** Hide the Notifications tab (e.g. for faculty). Defaults to shown. */
  showNotifications?: boolean;
}

function ChipList({ label, values }: { label: string; values?: string[] | null }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="secondary">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ReadonlyRow({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof User;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="break-words font-medium">{value}</p>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </div>
    </div>
  );
}

export default function MyProfile({ roleLabel, showNotifications = true }: MyProfileProps) {
  const { user, isLoading, refreshUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormState>({ phone: '', designation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData({
      phone: user.phone ?? '',
      designation: user.designation ?? '',
    });
  }, [user]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl space-y-6">
          <Skeleton className="h-10 w-56 bg-muted" />
          <Skeleton className="h-96 w-full bg-muted" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <User className="h-4 w-4" />
          <AlertTitle>Unable to load profile</AlertTitle>
          <AlertDescription>Please sign in again and retry.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  function validateProfile(): boolean {
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

  async function handleSaveProfile() {
    if (!validateProfile()) return;
    setIsSaving(true);
    try {
      const payload: UpdateMeRequest = {
        phone: formData.phone.trim() || null,
        designation: formData.designation.trim() || null,
      };
      await authService.updateMe(payload);
      await refreshUser();
      toast({
        title: 'Profile updated',
        description: 'Your contact details have been saved.',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Unable to update profile',
        description: formatApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    if (!user) return;
    setFormData({
      phone: user.phone ?? '',
      designation: user.designation ?? '',
    });
    setErrors({});
    setIsEditing(false);
  }

  async function handleChangePassword() {
    if (!passwordForm.current_password.trim() || !passwordForm.new_password.trim()) {
      toast({
        title: 'Missing details',
        description: 'Current and new password are required.',
        variant: 'destructive',
      });
      return;
    }
    const passwordPolicyError = getPasswordPolicyError(passwordForm.new_password);
    if (passwordPolicyError) {
      toast({
        title: 'Weak password',
        description: passwordPolicyError,
        variant: 'destructive',
      });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_new_password: passwordForm.confirm_new_password,
      });
      toast({
        title: 'Password changed',
        description: 'Your password has been updated.',
      });
      setPasswordForm(emptyPasswordForm);
    } catch (error) {
      toast({
        title: 'Unable to change password',
        description: formatApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const initials = getInitials(user.name || user.email, 2);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your account details and password.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            {showNotifications && <TabsTrigger value="notifications">Notifications</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xl font-semibold text-primary">{initials}</span>
                    </div>
                    <div>
                      <CardTitle>{user.name}</CardTitle>
                      <CardDescription>{user.designation || roleLabel}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {roleLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadonlyRow icon={User} label="Full Name" value={user.name} />
                  <ReadonlyRow
                    icon={Mail}
                    label="Email Address"
                    value={user.email}
                    helper="Contact your administrator to change."
                  />
                  {user.department ? (
                    <ReadonlyRow icon={Building2} label="Department" value={user.department} />
                  ) : null}
                  {user.tenant?.name ? (
                    <ReadonlyRow icon={GraduationCap} label="Institute" value={user.tenant.name} />
                  ) : null}
                  {user.last_login_at ? (
                    <ReadonlyRow
                      icon={Calendar}
                      label="Last Login"
                      value={formatDateTime(user.last_login_at)}
                    />
                  ) : null}
                  {user.created_at ? (
                    <ReadonlyRow
                      icon={Calendar}
                      label="Account Created"
                      value={formatDateTime(user.created_at)}
                    />
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <ChipList label="Institutes" values={(user as { institutes?: string[] }).institutes} />
                  <ChipList label="Courses" values={(user as { courses?: string[] }).courses} />
                  <ChipList label="Branches" values={(user as { branches?: string[] }).branches} />
                </div>

                <div className="border-t pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium">{user.crm_employee_code ? 'Contact Details' : 'Editable Details'}</h3>
                    {!isEditing && !user.crm_employee_code ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  {user.crm_employee_code ? (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Phone and designation are fetched from the ERP and cannot be edited.
                    </p>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="my-profile-phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      {isEditing ? (
                        <>
                          <Input
                            id="my-profile-phone"
                            value={formData.phone}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, phone: event.target.value }))
                            }
                            className={errors.phone ? 'border-destructive' : ''}
                            placeholder="+91 9876543210"
                          />
                          {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
                        </>
                      ) : (
                        <p className="p-2 text-sm">{user.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="my-profile-designation" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Designation
                      </Label>
                      {isEditing ? (
                        <>
                          <Input
                            id="my-profile-designation"
                            value={formData.designation}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, designation: event.target.value }))
                            }
                            className={errors.designation ? 'border-destructive' : ''}
                            placeholder="Placement Officer"
                          />
                          {errors.designation ? (
                            <p className="text-sm text-destructive">{errors.designation}</p>
                          ) : null}
                        </>
                      ) : (
                        <p className="p-2 text-sm">{user.designation || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Only your phone number and designation are editable here. For name, email, role, or
                  department changes, contact your administrator.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Password change
                </CardTitle>
                <CardDescription>
                  Update your password. We will revoke other active sessions after the change.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.current_password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, current_password: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.new_password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, new_password: event.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="confirm_new_password">Confirm New Password</Label>
                    <Input
                      id="confirm_new_password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm_new_password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirm_new_password: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handleChangePassword} disabled={isChangingPassword}>
                    <Lock className="mr-2 h-4 w-4" />
                    {isChangingPassword ? 'Updating...' : 'Change Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {showNotifications && (
            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const prefsQuery = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState<Record<NotificationType, boolean> | null>(null);

  useEffect(() => {
    if (!prefsQuery.data) return;
    const map: Record<string, boolean> = {};
    for (const pref of prefsQuery.data.preferences) {
      map[pref.category] = pref.enabled;
    }
    setLocalPrefs(map as Record<NotificationType, boolean>);
  }, [prefsQuery.data]);

  async function applyChange(next: Record<NotificationType, boolean>) {
    setLocalPrefs(next);
    const payload: NotificationPreference[] = (Object.entries(next) as [NotificationType, boolean][]).map(
      ([category, enabled]) => ({ category, enabled }),
    );
    try {
      await updateMutation.mutateAsync(payload);
    } catch (error) {
      toast({
        title: 'Unable to save preferences',
        description: formatApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  }

  function setAll(value: boolean) {
    if (!localPrefs) return;
    const next = { ...localPrefs };
    for (const category of NOTIFICATION_CATEGORY_ORDER) {
      next[category] = value;
    }
    void applyChange(next);
  }

  if (prefsQuery.isLoading || !localPrefs) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading preferences...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification preferences
            </CardTitle>
            <CardDescription>
              Choose which categories you want to receive in your inbox. Changes save automatically.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAll(true)} disabled={updateMutation.isPending}>
              <Bell className="mr-1 h-3 w-3" /> Enable all
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAll(false)} disabled={updateMutation.isPending}>
              <BellOff className="mr-1 h-3 w-3" /> Mute all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {NOTIFICATION_CATEGORY_ORDER.map((category) => {
          const meta = NOTIFICATION_CATEGORY_META[category];
          const enabled = localPrefs[category];
          return (
            <div
              key={category}
              className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{meta.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => {
                  void applyChange({ ...localPrefs, [category]: checked });
                }}
                disabled={updateMutation.isPending}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
