import { useMemo, useState, type ReactNode } from 'react';
import { Briefcase, CalendarDays, FileText, ListChecks, Loader2, Pencil, Plus, Tags, Trash2, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { UserScopeSelector } from '@/components/admin/UserScopeSelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import {
  useAdminMasters,
  useCreateAdminMaster,
  useDeleteAdminMaster,
  useUpdateAdminMaster,
} from '@/hooks/use-master-api';
import { useAdminNocTemplates } from '@/hooks/use-noc-template-api';
import { formatDateTime } from '@/lib/formatters';
import type { ApiMasterOption, MasterCategory } from '@/types/master';
import { NocTemplateManager } from '@/components/noc/NocTemplateManager';
import type { ApiNocTemplate } from '@/types/nocTemplate';

type TargetScopeState = {
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
  target_academic_years: string[];
};

const MASTER_CATEGORY_CONFIG: Record<MasterCategory, {
  label: string;
  singularLabel: string;
  description: string;
  icon: typeof Workflow;
  emptyTitle: string;
}> = {
  branch: {
    label: 'Branches',
    singularLabel: 'Branch',
    description: 'Used across branch, department, and eligibility selectors.',
    icon: Workflow,
    emptyTitle: 'No branch masters yet',
  },
  skill: {
    label: 'Skills',
    singularLabel: 'Skill',
    description: 'Shown to students as skill suggestions while keeping custom entry enabled.',
    icon: ListChecks,
    emptyTitle: 'No skill masters yet',
  },
  interest: {
    label: 'Interests',
    singularLabel: 'Interest',
    description: 'Used for student domain-interest suggestions.',
    icon: Tags,
    emptyTitle: 'No interest masters yet',
  },
  technology: {
    label: 'Technologies',
    singularLabel: 'Technology',
    description: 'Shown in student and portfolio technology selectors.',
    icon: Tags,
    emptyTitle: 'No technology masters yet',
  },
  academic_year: {
    label: 'Academic Years',
    singularLabel: 'Academic Year',
    description: 'Used wherever users choose an academic year across postings, reports, and engagement records.',
    icon: CalendarDays,
    emptyTitle: 'No academic year masters yet',
  },
  policy_category: {
    label: 'Policy Categories',
    singularLabel: 'Policy Category',
    description: 'Controls the category dropdown used while creating and editing policy documents.',
    icon: FileText,
    emptyTitle: 'No policy category masters yet',
  },
  noc_type: {
    label: 'NOC Types',
    singularLabel: 'NOC Type',
    description: 'Controls the NOC type choices shown to students while requesting certificates.',
    icon: FileText,
    emptyTitle: 'No NOC type masters yet',
  },
  posting_type: {
    label: 'Posting Types',
    singularLabel: 'Posting Type',
    description: 'Controls the posting type choices used in TPO workflows and reports, with optional student targeting.',
    icon: Briefcase,
    emptyTitle: 'No posting type masters yet',
  },
  event_type: {
    label: 'Event Types',
    singularLabel: 'Event Type',
    description: 'Controls the event type choices shown while creating drives and events.',
    icon: CalendarDays,
    emptyTitle: 'No event type masters yet',
  },
};

const MASTER_CATEGORY_ORDER: MasterCategory[] = [
  'branch',
  'skill',
  'interest',
  'technology',
  'academic_year',
  'policy_category',
  'noc_type',
  'posting_type',
  'event_type',
];

const ADMIN_SECTION_ORDER: Array<MasterCategory | 'noc_templates'> = [
  // 'branch', // Hidden from Master Data UI per request — config/type kept for back-compat.
  'skill',
  'interest',
  'technology',
  'academic_year',
  'policy_category',
  'noc_type',
  'posting_type',
  'event_type',
  'noc_templates',
];

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function createEmptyTargetScope(): TargetScopeState {
  return {
    target_institutes: [],
    target_courses: [],
    target_branches: [],
    target_semesters: [],
    target_academic_years: [],
  };
}

function summarizeTargetScope(values: string[]) {
  if (values.length === 0) {
    return 'All';
  }

  if (values.length <= 2) {
    return values.join(', ');
  }

  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
}

/**
 * Delete confirmation copy. For posting types the backend also returns dependent-record counts:
 * `postings` blocks the delete outright (FK is onDelete: Restrict), while NOC templates and student
 * preferences are cascade-deleted and linked policies fall back to global — all previously silent.
 */
function renderDeleteDescription(
  master: ApiMasterOption | undefined,
  fallbackCategory: MasterCategory,
) {
  const category = master?.category ?? fallbackCategory;
  const baseLine = `This will permanently delete the ${MASTER_CATEGORY_CONFIG[category].singularLabel.toLowerCase()} from the master catalog.`;
  const usage = master?.category === 'posting_type' ? master.usage : undefined;

  if (!usage) {
    return baseLine;
  }

  const plural = (count: number, singular: string) => `${count} ${singular}${count === 1 ? '' : 's'}`;
  const consequences: string[] = [];

  if (usage.noc_templates > 0) {
    consequences.push(`${plural(usage.noc_templates, 'NOC template')} will also be deleted.`);
  }
  if (usage.student_preferences > 0) {
    consequences.push(
      `${plural(usage.student_preferences, 'student placement-preference record')} will be removed.`,
    );
  }
  if (usage.policies > 0) {
    consequences.push(
      `${plural(usage.policies, 'linked policy').replace('policys', 'policies')} will become global (unlinked).`,
    );
  }

  return (
    <span className="block space-y-2">
      {usage.postings > 0 ? (
        <span className="block font-medium text-destructive">
          {plural(usage.postings, 'posting')} still use this posting type, so this delete will be
          rejected. Use Deactivate instead to hide it from new forms.
        </span>
      ) : (
        <span className="block">{baseLine}</span>
      )}
      {consequences.length > 0 ? (
        <span className="block">
          {usage.postings > 0 ? 'If the postings are removed first, deleting it would also:' : 'It will also:'}
          {/* Bullets are spans, not a <ul>: AlertDialogDescription renders a <p>, which cannot
              legally contain a list. */}
          {consequences.map((line) => (
            <span key={line} className="mt-1 block pl-4 -indent-3">
              • {line}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function MasterCategoryCard({
  config,
  category,
  items,
  isLoading,
  draftValue,
  onDraftChange,
  onCreate,
  onToggleActive,
  onToggleAccepting,
  onDelete,
  onEdit,
  isCreatePending,
  academicYearOptions = [],
  children,
}: {
  config: (typeof MASTER_CATEGORY_CONFIG)[MasterCategory];
  category: MasterCategory;
  items: ApiMasterOption[];
  isLoading: boolean;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onCreate: () => void;
  onToggleActive: (master: ApiMasterOption) => void;
  onToggleAccepting: (master: ApiMasterOption, next: boolean) => void;
  onDelete: (master: ApiMasterOption) => void;
  onEdit: (master: ApiMasterOption) => void;
  isCreatePending: boolean;
  academicYearOptions?: string[];
  children?: ReactNode;
}) {
  const Icon = config.icon;
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const isPostingType = category === 'posting_type';

  // Posting types can be filtered by academic-year scope. Untagged types (empty
  // target_academic_years) apply to all years and always pass the filter.
  const visibleItems = isPostingType && academicYearFilter !== 'all'
    ? items.filter((master) =>
        master.target_academic_years.length === 0
        || master.target_academic_years.map((value) => value.toLowerCase()).includes(academicYearFilter.toLowerCase()),
      )
    : items;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {config.label}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={`Add a new ${config.singularLabel.toLowerCase()}`}
          />
          <Button onClick={onCreate} disabled={isCreatePending}>
            {isCreatePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add
          </Button>
        </div>

        {children ? <div className="space-y-4">{children}</div> : null}

        {isPostingType && academicYearOptions.length > 0 ? (
          <div className="flex flex-col gap-1 sm:max-w-xs">
            <Label className="text-xs text-muted-foreground">Filter by academic year</Label>
            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All academic years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All academic years</SelectItem>
                {academicYearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {config.label.toLowerCase()}...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {config.emptyTitle}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No posting types for this academic year.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((master) => (
              <div
                key={master.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{master.value}</p>
                    <Badge variant={master.is_active ? 'default' : 'secondary'}>
                      {master.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {master.category === 'posting_type' ? (
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Institute: {summarizeTargetScope(master.target_institutes)}</p>
                      <p>Course: {summarizeTargetScope(master.target_courses)}</p>
                      <p>Branch: {summarizeTargetScope(master.target_branches)}</p>
                      <p>Semester: {summarizeTargetScope(master.target_semesters)}</p>
                      <p>Academic Year: {summarizeTargetScope(master.target_academic_years)}</p>
                    </div>
                  ) : null}
                  {master.category === 'posting_type' ? (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Companies ({master.companies?.length ?? 0})
                      </p>
                      {master.companies && master.companies.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {master.companies.map((company) => (
                            <Badge key={company.id} variant="secondary" className="font-normal">
                              {company.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No companies yet.</p>
                      )}
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {formatDateTime(master.updated_at)}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  {master.category === 'posting_type' ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`accepting-${master.id}`}
                        checked={master.accepting_applications !== false}
                        onCheckedChange={(next) => onToggleAccepting(master, next)}
                      />
                      <Label htmlFor={`accepting-${master.id}`} className="cursor-pointer text-xs font-medium">
                        Application Receiving {master.accepting_applications !== false ? 'ON' : 'OFF'}
                      </Label>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(master)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(master)}>
                      {master.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(master)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MasterDataManagement() {
  const [activeSection, setActiveSection] = useState<MasterCategory | 'noc_templates'>('skill');
  const [draftValues, setDraftValues] = useState<Record<MasterCategory, string>>({
    branch: '',
    skill: '',
    interest: '',
    technology: '',
    academic_year: '',
    policy_category: '',
    noc_type: '',
    posting_type: '',
    event_type: '',
  });
  const [postingTypeDraftScope, setPostingTypeDraftScope] = useState<TargetScopeState>(createEmptyTargetScope);
  const [editingMaster, setEditingMaster] = useState<ApiMasterOption | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingMasterScope, setEditingMasterScope] = useState<TargetScopeState>(createEmptyTargetScope);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'edit'; master: ApiMasterOption }
    | { type: 'toggle'; master: ApiMasterOption }
    | { type: 'delete'; master: ApiMasterOption }
    | null
  >(null);

  const mastersQuery = useAdminMasters({ include_inactive: true });
  const nocTemplatesQuery = useAdminNocTemplates();
  const createMaster = useCreateAdminMaster();
  const updateMaster = useUpdateAdminMaster();
  const deleteMaster = useDeleteAdminMaster();

  const groupedMasters = useMemo(() => {
    const emptyGroups: Record<MasterCategory, ApiMasterOption[]> = {
      branch: [],
      skill: [],
      interest: [],
      technology: [],
      academic_year: [],
      policy_category: [],
      noc_type: [],
      posting_type: [],
      event_type: [],
    };

    (mastersQuery.data ?? []).forEach((master) => {
      emptyGroups[master.category].push(master);
    });

    return emptyGroups;
  }, [mastersQuery.data]);

  async function handleCreate(category: MasterCategory) {
    const nextValue = draftValues[category].trim();
    if (!nextValue) {
      toast.error(`Enter a ${MASTER_CATEGORY_CONFIG[category].singularLabel.toLowerCase()} value first.`);
      return;
    }

    try {
      await createMaster.mutateAsync({
        category,
        value: nextValue,
        ...(category === 'posting_type' ? postingTypeDraftScope : {}),
      });
      setDraftValues((current) => ({ ...current, [category]: '' }));
      if (category === 'posting_type') {
        setPostingTypeDraftScope(createEmptyTargetScope());
      }
      toast.success(`${MASTER_CATEGORY_CONFIG[category].singularLabel} added.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to create this master right now.'));
    }
  }

  async function handleToggleActive(master: ApiMasterOption) {
    setPendingAction({ type: 'toggle', master });
  }

  // Application Receiving toggle — reversible + low-stakes, so no confirmation dialog.
  async function handleToggleAccepting(master: ApiMasterOption, next: boolean) {
    try {
      await updateMaster.mutateAsync({ masterId: master.id, data: { accepting_applications: next } });
      toast.success(`Application Receiving ${next ? 'ON' : 'OFF'} for ${master.value}.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update Application Receiving.'));
    }
  }

  async function handleDelete(master: ApiMasterOption) {
    setPendingAction({ type: 'delete', master });
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'edit') {
        const updatePayload = {
          value: editValue.trim(),
          ...(editingMaster?.category === 'posting_type' ? editingMasterScope : {}),
        };

        await updateMaster.mutateAsync({
          masterId: pendingAction.master.id,
          data: updatePayload,
        });
        toast.success('Master updated.');
        setEditingMaster(null);
        setEditValue('');
        setEditingMasterScope(createEmptyTargetScope());
      } else if (pendingAction.type === 'toggle') {
        await updateMaster.mutateAsync({
          masterId: pendingAction.master.id,
          data: { is_active: !pendingAction.master.is_active },
        });
        toast.success(`${pendingAction.master.value} ${pendingAction.master.is_active ? 'deactivated' : 'activated'}.`);
      } else {
        await deleteMaster.mutateAsync(pendingAction.master.id);
        toast.success(`${pendingAction.master.value} deleted.`);
      }
      setPendingAction(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to delete this master right now.'));
    }
  }

  function openEditDialog(master: ApiMasterOption) {
    setEditingMaster(master);
    setEditValue(master.value);
    setEditingMasterScope({
      target_institutes: master.target_institutes ?? [],
      target_courses: master.target_courses ?? [],
      target_branches: master.target_branches ?? [],
      target_semesters: master.target_semesters ?? [],
      target_academic_years: master.target_academic_years ?? [],
    });
  }

  async function handleSaveEdit() {
    if (!editingMaster) return;

    const nextValue = editValue.trim();
    if (!nextValue) {
      toast.error('Value is required.');
      return;
    }

    setPendingAction({ type: 'edit', master: editingMaster });
  }

  const activeConfig = activeSection === 'noc_templates' ? null : MASTER_CATEGORY_CONFIG[activeSection];
  const activeMasters = activeSection === 'noc_templates' ? [] : groupedMasters[activeSection];
  const currentCategory = activeSection === 'noc_templates' ? 'branch' : activeSection;

  return (
    <DashboardLayout
      title="Master Data"
      subtitle="Manage the vertical master catalog used across TPO and student flows"
    >
      <div className="space-y-6">
        {mastersQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load master data</AlertTitle>
            <AlertDescription>{getErrorMessage(mastersQuery.error, 'Please refresh and try again.')}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-1 pb-4">
              <p className="text-sm font-semibold text-foreground">Master Sections</p>
              <p className="text-xs text-muted-foreground">Choose a category from the left.</p>
            </div>
            <div className="space-y-2">
              {ADMIN_SECTION_ORDER.map((section) => {
                if (section === 'noc_templates') {
                  const isActive = activeSection === 'noc_templates';
                  const count = nocTemplatesQuery.data?.length ?? 0;

                  return (
                    <Button
                      key={section}
                      type="button"
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="h-auto w-full justify-between gap-3 px-3 py-3"
                      onClick={() => setActiveSection('noc_templates')}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate text-left">NOC Templates</span>
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {count}
                      </Badge>
                    </Button>
                  );
                }

                const config = MASTER_CATEGORY_CONFIG[section];
                const Icon = config.icon;
                const isActive = activeSection === section;
                const count = groupedMasters[section].length;

                return (
                  <Button
                    key={section}
                    type="button"
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="h-auto w-full justify-between gap-3 px-3 py-3"
                    onClick={() => setActiveSection(section)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate text-left">{config.label}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-6">
            {activeSection === 'noc_templates' ? (
              <NocTemplateManager
                postingTypes={groupedMasters.posting_type}
                templates={nocTemplatesQuery.data ?? []}
                isLoading={nocTemplatesQuery.isLoading}
                postingTypesLoading={mastersQuery.isLoading}
              />
            ) : activeConfig ? (
              <MasterCategoryCard
                config={activeConfig}
                category={currentCategory}
                academicYearOptions={groupedMasters.academic_year.map((master) => master.value)}
                items={activeMasters as ApiMasterOption[]}
                isLoading={mastersQuery.isLoading}
                draftValue={draftValues[currentCategory]}
                onDraftChange={(value) => setDraftValues((current) => ({ ...current, [currentCategory]: value }))}
                onCreate={() => void handleCreate(currentCategory)}
                onToggleActive={handleToggleActive}
                onToggleAccepting={handleToggleAccepting}
                onDelete={handleDelete}
                onEdit={openEditDialog}
                isCreatePending={createMaster.isPending}
              >
                {currentCategory === 'posting_type' ? (
                  <UserScopeSelector
                    targetInstitutes={postingTypeDraftScope.target_institutes}
                    targetCourses={postingTypeDraftScope.target_courses}
                    targetBranches={postingTypeDraftScope.target_branches}
                    targetSemesters={postingTypeDraftScope.target_semesters}
                    targetAcademicYears={postingTypeDraftScope.target_academic_years}
                    onTargetInstitutesChange={(values) =>
                      setPostingTypeDraftScope((current) => ({
                        ...current,
                        target_institutes: values,
                        target_courses: [],
                        target_branches: [],
                      }))
                    }
                    onTargetCoursesChange={(values) =>
                      setPostingTypeDraftScope((current) => ({
                        ...current,
                        target_courses: values,
                        target_branches: [],
                      }))
                    }
                    onTargetBranchesChange={(values) =>
                      setPostingTypeDraftScope((current) => ({
                        ...current,
                        target_branches: values,
                      }))
                    }
                    onTargetSemestersChange={(values) =>
                      setPostingTypeDraftScope((current) => ({
                        ...current,
                        target_semesters: values,
                      }))
                    }
                    onTargetAcademicYearsChange={(values) =>
                      setPostingTypeDraftScope((current) => ({
                        ...current,
                        target_academic_years: values,
                      }))
                    }
                  />
                ) : null}
              </MasterCategoryCard>
            ) : null}
          </section>
        </div>

        <Dialog
          open={Boolean(editingMaster)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMaster(null);
              setEditValue('');
              setEditingMasterScope(createEmptyTargetScope());
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Master Value</DialogTitle>
              <DialogDescription>
                Update the selected {editingMaster ? MASTER_CATEGORY_CONFIG[editingMaster.category].singularLabel.toLowerCase() : 'master'} value.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="master-value">Value</Label>
              <Input
                id="master-value"
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
              />
            </div>
            {editingMaster?.category === 'posting_type' ? (
              <UserScopeSelector
                targetInstitutes={editingMasterScope.target_institutes}
                targetCourses={editingMasterScope.target_courses}
                targetBranches={editingMasterScope.target_branches}
                targetSemesters={editingMasterScope.target_semesters}
                targetAcademicYears={editingMasterScope.target_academic_years}
                onTargetInstitutesChange={(values) =>
                  setEditingMasterScope((current) => ({
                    ...current,
                    target_institutes: values,
                    target_courses: [],
                    target_branches: [],
                  }))
                }
                onTargetCoursesChange={(values) =>
                  setEditingMasterScope((current) => ({
                    ...current,
                    target_courses: values,
                    target_branches: [],
                  }))
                }
                onTargetBranchesChange={(values) =>
                  setEditingMasterScope((current) => ({
                    ...current,
                    target_branches: values,
                  }))
                }
                onTargetSemestersChange={(values) =>
                  setEditingMasterScope((current) => ({
                    ...current,
                    target_semesters: values,
                  }))
                }
                onTargetAcademicYearsChange={(values) =>
                  setEditingMasterScope((current) => ({
                    ...current,
                    target_academic_years: values,
                  }))
                }
              />
            ) : null}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingMaster(null);
                  setEditValue('');
                  setEditingMasterScope(createEmptyTargetScope());
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSaveEdit()} disabled={updateMaster.isPending}>
                {updateMaster.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmActionDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          title={
            pendingAction?.type === 'edit'
              ? `Save changes for "${pendingAction.master.value}"?`
              : pendingAction?.type === 'toggle'
              ? `${pendingAction.master.is_active ? 'Deactivate' : 'Activate'} "${pendingAction.master.value}"?`
              : `Delete "${pendingAction?.master.value ?? 'master'}"?`
          }
          description={
            pendingAction?.type === 'edit'
              ? 'This will update the master value across all live forms.'
              : pendingAction?.type === 'toggle'
              ? `This will mark the ${MASTER_CATEGORY_CONFIG[pendingAction.master.category].singularLabel.toLowerCase()} as ${pendingAction.master.is_active ? 'inactive' : 'active'}.`
              : renderDeleteDescription(
                  pendingAction?.master,
                  activeSection === 'noc_templates' ? 'branch' : activeSection,
                )
          }
          confirmLabel={
            pendingAction?.type === 'edit'
              ? 'Save Changes'
              : pendingAction?.type === 'toggle'
                ? pendingAction.master.is_active ? 'Deactivate' : 'Activate'
              : 'Delete Master'
          }
          confirmVariant={pendingAction?.type === 'delete' ? 'destructive' : 'default'}
          isPending={updateMaster.isPending || deleteMaster.isPending}
          onConfirm={handleConfirmAction}
        />
      </div>
    </DashboardLayout>
  );
}
