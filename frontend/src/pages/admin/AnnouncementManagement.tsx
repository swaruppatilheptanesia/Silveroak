import { useDeferredValue, useMemo, useState } from 'react';
import {
  Archive,
  BarChart3,
  Edit,
  Eye,
  FileText,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { MasterMultiSelect } from '@/components/shared/MasterMultiSelect';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { AnnouncementAudienceSelector } from '@/components/admin/AnnouncementAudienceSelector';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { Textarea } from '@/components/ui/textarea';
import {
  useAnnouncementDetail,
  useAnnouncements,
  useArchiveAnnouncement,
  useCreateAnnouncement,
  usePublishAnnouncement,
  useUpdateAnnouncement,
  useUploadAnnouncementAttachment,
} from '@/hooks/use-announcement-api';
import { useGeneratedCirculars } from '@/hooks/use-circular-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePostings } from '@/hooks/use-posting-api';
import {
  buildAnnouncementContentFromCircular,
  extractCircularDepartments,
  getAnnouncementAudienceLabel,
  getAnnouncementConsentRate,
  getAnnouncementErrorMessage,
  getAnnouncementPriorityMeta,
  getAnnouncementReadRate,
  getAnnouncementStatusMeta,
} from '@/lib/announcementModule';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { addMasterValue, mergeMasterValues } from '@/lib/masterModule';
import type {
  AnnouncementPriority,
  AnnouncementStatus,
  ApiAnnouncementListItem,
  CreateAnnouncementInput,
  TargetAudienceType,
} from '@/types/announcement';

type FormMode = 'create' | 'edit';
type ContentMode = 'manual' | 'circular';

interface AnnouncementFormState {
  mode: FormMode;
  contentMode: ContentMode;
  announcementId: string | null;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audienceType: TargetAudienceType;
  institutes: string[];
  courses: string[];
  branches: string[];
  departments: string[];
  batches: string[];
  semesters: string[];
  requiresConsent: boolean;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
  selectedCircularId: string;
  postingId: string;
  currentStatus: AnnouncementStatus | null;
}

function createEmptyFormState(): AnnouncementFormState {
  return {
    mode: 'create',
    contentMode: 'manual',
    announcementId: null,
    title: '',
    content: '',
    priority: 'medium',
    audienceType: 'all',
    institutes: [],
    courses: [],
    branches: [],
    departments: [],
    batches: [],
    semesters: [],
    requiresConsent: false,
    attachmentUrl: null,
    attachmentName: null,
    attachmentMimeType: null,
    attachmentSize: null,
    selectedCircularId: '',
    postingId: '',
    currentStatus: null,
  };
}

// "Specific Semester" is no longer an audience MODE — semester is a scope level in the audience
// selector, AND-ed like institute/course/branch. Keeping it selectable here would let an admin pick
// the mode with no semesters and silently reach nobody.
function getAudienceOptions() {
  return [
    { value: 'all' as const, label: 'All Students' },
    { value: 'eligible_for_posting' as const, label: 'Eligible for Posting' },
  ];
}

// Audience types still valid in data but removed from the create UI — coerce on edit-load.
// A legacy 'semester' announcement loads as "All Students" with its semesters preserved in the
// scope selector: the backend now AND-s target_semesters for every audience type, so the recipient
// set is unchanged — it just stops the Select rendering blank for a value that has no option.
const SUPPORTED_AUDIENCE_TYPES: TargetAudienceType[] = ['all', 'eligible_for_posting'];

function getFormStateFromAnnouncement(announcement: ApiAnnouncementListItem): AnnouncementFormState {
  return {
    mode: 'edit',
    contentMode: announcement.linked_circular_id ? 'circular' : 'manual',
    announcementId: announcement.id,
    title: announcement.title,
    content: announcement.content,
    priority: announcement.priority,
    // Legacy batch/department announcements no longer have a UI option — show them as "All".
    audienceType: SUPPORTED_AUDIENCE_TYPES.includes(announcement.target_audience_type)
      ? announcement.target_audience_type
      : 'all',
    institutes: announcement.target_institutes,
    courses: announcement.target_courses,
    branches: announcement.target_branches,
    departments: announcement.target_departments,
    batches: announcement.target_batches,
    semesters: announcement.target_semesters ?? [],
    requiresConsent: announcement.requires_consent,
    attachmentUrl: announcement.attachment_url,
    attachmentName: announcement.attachment_name,
    attachmentMimeType: announcement.attachment_mime_type,
    attachmentSize: announcement.attachment_size,
    selectedCircularId: announcement.linked_circular_id ?? '',
    postingId: announcement.target_posting_id ?? '',
    currentStatus: announcement.status,
  };
}

export default function AnnouncementManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | AnnouncementPriority>('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');
  const [form, setForm] = useState<AnnouncementFormState>(createEmptyFormState());
  const [customDepartment, setCustomDepartment] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const uploadAttachment = useUploadAnnouncementAttachment();
  const [pendingAction, setPendingAction] = useState<
    | { type: 'publish'; announcement: ApiAnnouncementListItem }
    | { type: 'archive'; announcement: ApiAnnouncementListItem }
    | null
  >(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const branchMasterValues = useMasterValues('branch');

  const totalQuery = useAnnouncements({ page: 1, limit: 1 });
  const publishedQuery = useAnnouncements({ page: 1, limit: 1, status: 'published' });
  const draftQuery = useAnnouncements({ page: 1, limit: 1, status: 'draft' });
  const archivedQuery = useAnnouncements({ page: 1, limit: 1, status: 'archived' });
  const { sort_by, sort_order, onSort } = useServerSort<
    'title' | 'priority' | 'status' | 'published_at' | 'created_at'
  >('created_at', 'desc');
  const announcementsQuery = useAnnouncements({
    limit: 100,
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    sort_by,
    sort_order,
  });
  const detailQuery = useAnnouncementDetail(selectedAnnouncementId);
  const generatedCircularsQuery = useGeneratedCirculars();
  const postingsQuery = usePostings({
    limit: 100,
    status: 'published',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const publishAnnouncement = usePublishAnnouncement();
  const archiveAnnouncement = useArchiveAnnouncement();

  const statsQueries = [totalQuery, publishedQuery, draftQuery, archivedQuery];
  const isInitialLoading = statsQueries.some((query) => query.isLoading) || announcementsQuery.isLoading;
  const hasInitialError = statsQueries.find((query) => query.error)?.error || announcementsQuery.error;

  const announcements = useMemo(
    () => announcementsQuery.data?.data ?? [],
    [announcementsQuery.data],
  );
  const filteredAnnouncements = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return announcements;
    }

    return announcements.filter((announcement) => {
      return announcement.title.toLowerCase().includes(normalizedSearch)
        || announcement.content.toLowerCase().includes(normalizedSearch);
    });
  }, [announcements, deferredSearch]);

  const selectedAnnouncement = detailQuery.data
    ?? announcements.find((announcement) => announcement.id === selectedAnnouncementId)
    ?? null;
  const selectedAnnouncementReceipts = detailQuery.data?.receipts ?? [];
  const selectedLinkedCircular = detailQuery.data?.linked_circular ?? null;

  const generatedCirculars = generatedCircularsQuery.data ?? [];
  const publishedPostings = postingsQuery.data?.data ?? [];
  const branchOptions = useMemo(
    () => mergeMasterValues(branchMasterValues.data ?? [], form.departments),
    [branchMasterValues.data, form.departments],
  );

  if (isInitialLoading) {
    return (
      <DashboardLayout
        title="Announcements"
        subtitle="Create and manage student communications"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (hasInitialError) {
    return (
      <DashboardLayout
        title="Announcements"
        subtitle="Create and manage student communications"
      >
        <Alert variant="destructive">
          <Megaphone className="h-4 w-4" />
          <AlertTitle>Unable to load announcements</AlertTitle>
          <AlertDescription>
            {getAnnouncementErrorMessage(hasInitialError, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  function resetForm() {
    setForm(createEmptyFormState());
    setCustomDepartment('');
    setAttachmentFile(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(announcement: ApiAnnouncementListItem) {
    setForm(getFormStateFromAnnouncement(announcement));
    setCustomDepartment('');
    setAttachmentFile(null);
    setDialogOpen(true);
  }

  function updateForm<K extends keyof AnnouncementFormState>(key: K, value: AnnouncementFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleAddCustomDepartment() {
    const trimmedValue = customDepartment.trim();
    if (!trimmedValue) return;

    updateForm('departments', addMasterValue(form.departments, trimmedValue));
    setCustomDepartment('');
  }

  function handleCircularSelect(circularId: string) {
    const circular = generatedCirculars.find((entry) => entry.id === circularId);

    setForm((current) => {
      if (!circular) {
        return {
          ...current,
          selectedCircularId: circularId,
          contentMode: 'circular',
        };
      }

      return {
        ...current,
        contentMode: 'circular',
        selectedCircularId: circularId,
        title: `${circular.company_name} | ${circular.role_name}`,
        content: buildAnnouncementContentFromCircular(circular),
        priority: 'high',
      };
    });
  }

  function buildPayload(): CreateAnnouncementInput {
    return {
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      target_audience_type: form.audienceType,
      target_institutes: form.institutes,
      target_courses: form.courses,
      target_branches: form.branches,
      // Semester is now a scope level (AND-ed like institute/course/branch), not a mode-specific
      // field, so it is always sent regardless of the audience type.
      target_semesters: form.semesters,
      target_posting_id: form.audienceType === 'eligible_for_posting' ? form.postingId || null : null,
      requires_consent: form.requiresConsent,
      attachment_url: form.attachmentUrl,
      attachment_name: form.attachmentName,
      attachment_mime_type: form.attachmentMimeType,
      attachment_size: form.attachmentSize,
      linked_circular_id: form.contentMode === 'circular' && form.selectedCircularId ? form.selectedCircularId : null,
    };
  }

  function validateForm() {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.content.trim()) return 'Content is required.';
    if (form.audienceType === 'eligible_for_posting' && !form.postingId) {
      return 'Select a posting for the eligibility-based audience.';
    }
    return null;
  }

  async function handleSave(publishNow: boolean) {
    const validationMessage = validateForm();

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    let payload = buildPayload();

    try {
      if (attachmentFile) {
        const uploaded = await uploadAttachment.mutateAsync(attachmentFile);
        payload = { ...payload, ...uploaded };
      }

      if (form.mode === 'edit' && form.announcementId) {
        const updated = await updateAnnouncement.mutateAsync({
          announcementId: form.announcementId,
          data: payload,
        });

        if (publishNow && updated.status === 'draft') {
          await publishAnnouncement.mutateAsync(updated.id);
        }

        toast.success(
          publishNow && updated.status === 'draft'
            ? 'Announcement updated and published.'
            : 'Announcement updated successfully.'
        );
      } else {
        const created = await createAnnouncement.mutateAsync(payload);

        if (publishNow) {
          await publishAnnouncement.mutateAsync(created.id);
        }

        toast.success(publishNow ? 'Announcement published.' : 'Draft saved successfully.');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(getAnnouncementErrorMessage(error, 'Unable to save the announcement.'));
    }
  }

  async function handlePublish(announcement: ApiAnnouncementListItem) {
    setPendingAction({ type: 'publish', announcement });
  }

  async function handleArchive(announcement: ApiAnnouncementListItem) {
    setPendingAction({ type: 'archive', announcement });
  }

  // Publishing an archived announcement is a "republish" — same endpoint, different wording.
  const isRepublishAction = pendingAction?.type === 'publish'
    && pendingAction.announcement.status === 'archived';

  async function handleConfirmAction() {
    if (!pendingAction) return;

    const republishing = pendingAction.announcement.status === 'archived';

    try {
      if (pendingAction.type === 'publish') {
        await publishAnnouncement.mutateAsync(pendingAction.announcement.id);
        toast.success(
          republishing
            ? 'Announcement republished successfully.'
            : 'Announcement published successfully.',
        );
      } else {
        await archiveAnnouncement.mutateAsync(pendingAction.announcement.id);
        toast.success('Announcement archived successfully.');
        if (selectedAnnouncementId === pendingAction.announcement.id) {
          setSelectedAnnouncementId('');
        }
      }
      setPendingAction(null);
    } catch (error) {
      toast.error(
        getAnnouncementErrorMessage(
          error,
          pendingAction.type === 'publish'
            ? republishing
              ? 'Unable to republish the announcement.'
              : 'Unable to publish the announcement.'
            : 'Unable to archive the announcement.'
        )
      );
    }
  }

  const isSaving = createAnnouncement.isPending || updateAnnouncement.isPending || publishAnnouncement.isPending;

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="Create and manage student communications"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{totalQuery.data?.pagination.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-semibold">{publishedQuery.data?.pagination.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Edit className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-semibold">{draftQuery.data?.pagination.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-sky-500/10 p-2">
                <BarChart3 className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-semibold">{archivedQuery.data?.pagination.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 lg:flex-row">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger className="w-full lg:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as typeof priorityFilter)}>
                  <SelectTrigger className="w-full lg:w-[160px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </div>
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: setInstituteFilter }}
              course={{ value: courseFilter, onChange: setCourseFilter }}
              branch={{ value: branchFilter, onChange: setBranchFilter }}
              dateRange={{ value: dateRange, onChange: setDateRange }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filteredAnnouncements.length === 0 ? (
              <EmptyState
                className="p-6"
                compact
                icon={Megaphone}
                title="No announcements found"
                description="Create your first announcement or adjust the current filters."
                actionLabel="New Announcement"
                onAction={openCreateDialog}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Title" columnKey="title" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Priority" columnKey="priority" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Audience</TableHead>
                      <TableHead className="text-center">Recipients</TableHead>
                      <TableHead className="text-center">Read Rate</TableHead>
                      <SortableTableHead label="Published" columnKey="published_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnnouncements.map((announcement) => (
                      <TableRow
                        key={announcement.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAnnouncementId(announcement.id)}
                      >
                        <TableCell className="max-w-[280px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-foreground">{announcement.title}</p>
                              {announcement.linked_circular_id ? (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Circular
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {announcement.requires_consent ? (
                                <Badge variant="secondary">Consent Required</Badge>
                              ) : null}
                              <p className="line-clamp-1 text-xs text-muted-foreground">{announcement.content}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAnnouncementPriorityMeta(announcement.priority).variant}>
                            {getAnnouncementPriorityMeta(announcement.priority).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAnnouncementStatusMeta(announcement.status).variant}>
                            {getAnnouncementStatusMeta(announcement.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{getAnnouncementAudienceLabel(announcement)}</TableCell>
                        <TableCell className="text-center">{announcement.total_recipients.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-center">
                          {announcement.status === 'draft' ? (
                            <span className="text-xs text-muted-foreground">Draft</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Progress className="h-2 w-16" value={getAnnouncementReadRate(announcement)} />
                              <span className="text-xs text-muted-foreground">
                                {getAnnouncementReadRate(announcement)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {announcement.published_at ? formatDate(announcement.published_at) : 'Not published'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedAnnouncementId(announcement.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {announcement.status !== 'archived' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditDialog(announcement);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.mode === 'edit' ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
            <DialogDescription>
              Compose manually or start from a generated circular. Publishing will compute the live recipient count.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={form.contentMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => updateForm('contentMode', 'manual')}
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  Manual
                </Button>
                <Button
                  type="button"
                  variant={form.contentMode === 'circular' ? 'default' : 'outline'}
                  onClick={() => updateForm('contentMode', 'circular')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  From Circular
                </Button>
              </div>

              {form.contentMode === 'circular' ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4">
                  <div className="space-y-2">
                    <Label>Select Generated Circular</Label>
                    <Select
                      value={form.selectedCircularId || 'none'}
                      onValueChange={(value) => handleCircularSelect(value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a circular..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a circular</SelectItem>
                        {generatedCirculars.map((circular) => (
                          <SelectItem key={circular.id} value={circular.id}>
                            {circular.company_name} - {circular.role_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      The title and content can still be edited after the circular is selected.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  maxLength={200}
                  placeholder="Announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcement-content">Content</Label>
                <Textarea
                  id="announcement-content"
                  rows={8}
                  value={form.content}
                  onChange={(event) => updateForm('content', event.target.value)}
                  maxLength={5000}
                  placeholder="Announcement content..."
                />
                <p className="text-right text-xs text-muted-foreground">{form.content.length}/5000</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(value) => updateForm('priority', value as AnnouncementPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={form.audienceType} onValueChange={(value) => updateForm('audienceType', value as TargetAudienceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAudienceOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <AnnouncementAudienceSelector
                targetInstitutes={form.institutes}
                targetCourses={form.courses}
                targetBranches={form.branches}
                targetSemesters={form.semesters}
                onTargetInstitutesChange={(values) => updateForm('institutes', values)}
                onTargetCoursesChange={(values) => updateForm('courses', values)}
                onTargetBranchesChange={(values) => updateForm('branches', values)}
                onTargetSemestersChange={(values) => updateForm('semesters', values)}
              />

              {form.audienceType === 'eligible_for_posting' ? (
                <div className="space-y-2">
                  <Label>Target Posting</Label>
                  <Select value={form.postingId || 'none'} onValueChange={(value) => updateForm('postingId', value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a posting..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a posting</SelectItem>
                      {publishedPostings.map((posting) => (
                        <SelectItem key={posting.id} value={posting.id}>
                          {posting.title} - {posting.company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Students will only see this announcement if they match the selected posting's live eligibility rules.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>
                  Attachment <span className="text-xs text-muted-foreground">(optional — PDF or image)</span>
                </Label>
                <Input
                  type="file"
                  accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, or WEBP.</p>
                {attachmentFile ? (
                  <p className="text-xs text-muted-foreground">Ready to upload: {attachmentFile.name}</p>
                ) : form.attachmentUrl ? (
                  <p className="text-xs text-muted-foreground">
                    Current:{' '}
                    <a
                      href={resolveBackendAssetUrl(form.attachmentUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {form.attachmentName || 'View attachment'}
                    </a>
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Switch
                  checked={form.requiresConsent}
                  onCheckedChange={(value) => updateForm('requiresConsent', value)}
                />
                <div>
                  <p className="text-sm font-medium">Require consent</p>
                  <p className="text-xs text-muted-foreground">
                    Students must explicitly acknowledge the announcement after reading it.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {generatedCircularsQuery.error ? 'Generated circulars are unavailable right now. Manual mode still works.' : ' '}
            </div>
            <div className="flex gap-2">
              {form.mode === 'create' ? (
                <Button variant="outline" onClick={() => void handleSave(false)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Draft
                </Button>
              ) : null}
              <Button onClick={() => void handleSave(form.mode === 'create' || form.currentStatus === 'draft')} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : form.mode === 'create' || form.currentStatus === 'draft' ? <Send className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                {form.mode === 'create' || form.currentStatus === 'draft' ? 'Save and Publish' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(selectedAnnouncementId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAnnouncementId('');
          }
        }}
      >
        <SheetContent className="flex w-full flex-col sm:max-w-xl">
          {selectedAnnouncementId && detailQuery.isLoading && !selectedAnnouncement ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedAnnouncement ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-start gap-2">
                  <span className="flex-1">{selectedAnnouncement.title}</span>
                  <Badge variant={getAnnouncementPriorityMeta(selectedAnnouncement.priority).variant}>
                    {getAnnouncementPriorityMeta(selectedAnnouncement.priority).label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Created by {selectedAnnouncement.created_by_user?.name || 'Placement Cell'}
                  {' • '}
                  {formatDateTime(selectedAnnouncement.created_at)}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-4 flex-1">
                <div className="space-y-5 pr-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getAnnouncementStatusMeta(selectedAnnouncement.status).variant}>
                      {getAnnouncementStatusMeta(selectedAnnouncement.status).label}
                    </Badge>
                    <Badge variant="outline">{getAnnouncementAudienceLabel(selectedAnnouncement)}</Badge>
                    {selectedAnnouncement.requires_consent ? (
                      <Badge variant="secondary">Consent Required</Badge>
                    ) : null}
                    {selectedLinkedCircular ? (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Linked Circular
                      </Badge>
                    ) : null}
                  </div>

                  {selectedLinkedCircular ? (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Attached Circular</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedLinkedCircular.template?.name || 'Generated circular'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="font-medium">{selectedLinkedCircular.company_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Role</p>
                          <p className="font-medium">{selectedLinkedCircular.role_name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {selectedAnnouncement.content}
                      </p>
                    </CardContent>
                  </Card>

                  {selectedAnnouncement.status !== 'draft' ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Delivery Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Recipients</p>
                            <p className="text-2xl font-semibold">{selectedAnnouncement.total_recipients.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Read</p>
                            <p className="text-2xl font-semibold">{selectedAnnouncement.read_count.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-muted-foreground">{getAnnouncementReadRate(selectedAnnouncement)}% read rate</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Consented</p>
                            <p className="text-2xl font-semibold">{selectedAnnouncement.consent_count.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-muted-foreground">{getAnnouncementConsentRate(selectedAnnouncement)}% consent rate</p>
                          </div>
                        </div>
                        <Progress value={getAnnouncementReadRate(selectedAnnouncement)} />
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Read and Consent Log</CardTitle>
                      <CardDescription className="text-xs">
                        Individual student acknowledgement records for this announcement.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {selectedAnnouncementReceipts.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          No read receipts have been recorded yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Read</TableHead>
                                <TableHead>Consent</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedAnnouncementReceipts.map((receipt) => (
                                <TableRow key={receipt.id}>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{receipt.student.full_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {receipt.student.enrollment_number}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{receipt.student.department}</TableCell>
                                  <TableCell className="text-sm">
                                    {receipt.is_read && receipt.read_at ? formatDateTime(receipt.read_at) : 'Pending'}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {receipt.has_consented && receipt.consented_at ? formatDateTime(receipt.consented_at) : 'Pending'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                {selectedAnnouncement.status !== 'archived' ? (
                  <Button variant="outline" onClick={() => openEditDialog(selectedAnnouncement)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : null}
                {selectedAnnouncement.status !== 'published' ? (
                  <Button onClick={() => void handlePublish(selectedAnnouncement)}>
                    <Send className="mr-2 h-4 w-4" />
                    {selectedAnnouncement.status === 'archived' ? 'Republish' : 'Publish'}
                  </Button>
                ) : null}
                {selectedAnnouncement.status === 'published' ? (
                  <Button variant="outline" onClick={() => void handleArchive(selectedAnnouncement)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction?.type === 'publish'
            ? `${isRepublishAction ? 'Republish' : 'Publish'} "${pendingAction.announcement.title}"?`
            : `Archive "${pendingAction?.announcement.title ?? 'announcement'}"?`
        }
        description={
          pendingAction?.type === 'publish'
            ? isRepublishAction
              ? 'This will move the announcement back into the active feed and notify students again.'
              : 'This will make the announcement visible to students and notify them.'
            : 'This will remove the announcement from the active feed.'
        }
        confirmLabel={
          pendingAction?.type === 'publish'
            ? isRepublishAction
              ? 'Republish Announcement'
              : 'Publish Announcement'
            : 'Archive Announcement'
        }
        confirmVariant={pendingAction?.type === 'archive' ? 'destructive' : 'default'}
        isPending={publishAnnouncement.isPending || archiveAnnouncement.isPending}
        onConfirm={handleConfirmAction}
      />
    </DashboardLayout>
  );
}
