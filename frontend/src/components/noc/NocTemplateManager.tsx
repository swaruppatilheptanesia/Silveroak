import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { PolicyRichTextEditor } from '@/components/admin/PolicyRichTextEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NocTemplatePreview } from './NocTemplatePreview';
import { buildDefaultNocTemplatePreviewValues } from '@/lib/nocTemplateModule';
import { useUpsertAdminNocTemplate } from '@/hooks/use-noc-template-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { NocTemplateApiError } from '@/services/nocTemplateService';
import type { ApiMasterOption } from '@/types/master';
import type { ApiNocTemplate, UpsertNocTemplateInput } from '@/types/nocTemplate';

function getPostingTypeValue(postingTypes: ApiMasterOption[], postingTypeId: string) {
  return postingTypes.find((item) => item.id === postingTypeId) ?? null;
}

function normalizeScopeValue(value: string) {
  return value.trim().toLowerCase();
}

function getTemplateForSelection(templates: ApiNocTemplate[], postingTypeId: string, branchScope: string) {
  const normalizedBranch = normalizeScopeValue(branchScope);

  return (
    templates.find(
      (template) =>
        template.posting_type_master_id === postingTypeId
        && normalizeScopeValue(template.branch_scope) === normalizedBranch
    )
    ?? templates.find(
      (template) =>
        template.posting_type_master_id === postingTypeId
        && normalizeScopeValue(template.branch_scope) === 'all'
    )
    ?? null
  );
}

export function NocTemplateManager({
  postingTypes,
  templates,
  isLoading,
  postingTypesLoading,
}: {
  postingTypes: ApiMasterOption[];
  templates: ApiNocTemplate[];
  isLoading: boolean;
  postingTypesLoading: boolean;
}) {
  const upsertTemplate = useUpsertAdminNocTemplate();
  const [selectedPostingTypeId, setSelectedPostingTypeId] = useState('');
  const [selectedBranchScope, setSelectedBranchScope] = useState('ALL');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [pendingSave, setPendingSave] = useState(false);
  const [lastHydratedTemplateKey, setLastHydratedTemplateKey] = useState<string | null>(null);
  const branchValuesQuery = useMasterValues('branch');

  const selectedPostingType = useMemo(
    () => getPostingTypeValue(postingTypes, selectedPostingTypeId),
    [postingTypes, selectedPostingTypeId]
  );

  const selectedTemplate = useMemo(
    () => getTemplateForSelection(templates, selectedPostingTypeId, selectedBranchScope),
    [templates, selectedBranchScope, selectedPostingTypeId]
  );

  const defaultPreviewValues = useMemo(() => buildDefaultNocTemplatePreviewValues(), []);

  const postingTypeOptions = useMemo(
    () => postingTypes.map((postingType) => ({
      value: postingType.id,
      label: postingType.value,
      description: postingType.is_active ? 'Active' : 'Inactive',
      keywords: [postingType.category],
    })),
    [postingTypes]
  );

  const branchOptions = useMemo(() => {
    const liveValues = branchValuesQuery.data ?? [];
    const seen = new Set<string>();

    const options = [
      {
        value: 'ALL',
        label: 'All Branches',
        description: 'Applies to every branch',
        keywords: ['all', 'branch'],
      },
      ...liveValues.map((branch) => ({
        value: branch,
        label: branch,
        keywords: [branch],
      })),
    ];

    return options.filter((option) => {
      const normalized = normalizeScopeValue(option.value);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [branchValuesQuery.data]);

  const previewValues = useMemo(() => ({
    ...defaultPreviewValues,
    program_label: selectedPostingType?.value ?? 'Posting Type',
  }), [defaultPreviewValues, selectedPostingType?.value]);

  useEffect(() => {
    if (selectedPostingTypeId || postingTypes.length === 0) return;
    setSelectedPostingTypeId(postingTypes[0].id);
  }, [postingTypes, selectedPostingTypeId]);

  useEffect(() => {
    if (!selectedPostingTypeId) return;

    const nextTemplateKey = selectedTemplate ? `${selectedTemplate.posting_type_master_id}:${selectedTemplate.branch_scope}` : null;
    if (nextTemplateKey && lastHydratedTemplateKey === nextTemplateKey) {
      return;
    }

    setName(selectedTemplate?.name ?? `NOC Template - ${selectedPostingType?.value ?? 'Posting Type'}`);
    setSubject(selectedTemplate?.subject ?? `${selectedPostingType?.value ?? 'Program'} Program`);
    setBodyHtml(selectedTemplate?.body_html ?? '<p>Dear Sir/Ma&#39;am,</p><p>Enter the certificate body for this posting type.</p>');
    setSelectedBranchScope(selectedTemplate?.branch_scope ?? 'ALL');
    setLastHydratedTemplateKey(nextTemplateKey);
  }, [lastHydratedTemplateKey, selectedPostingType?.value, selectedPostingTypeId, selectedTemplate]);

  async function handleSave() {
    if (!selectedPostingTypeId) {
      toast.error('Select a posting type first.');
      return;
    }

    const payload: UpsertNocTemplateInput = {
      name: name.trim(),
      subject: subject.trim(),
      body_html: bodyHtml.trim(),
      branch_scope: selectedBranchScope,
    };

    if (!payload.name || !payload.subject || !payload.body_html) {
      toast.error('Fill the template name, subject, and body before saving.');
      return;
    }

    try {
      await upsertTemplate.mutateAsync({
        postingTypeMasterId: selectedPostingTypeId,
        data: payload,
      });
      toast.success(`Template saved for ${selectedPostingType?.value ?? 'selected posting type'} • ${selectedBranchScope === 'ALL' ? 'All Branches' : selectedBranchScope}.`);
      setPendingSave(false);
    } catch (error) {
      if (error instanceof NocTemplateApiError && error.details.length > 0) {
        const firstDetail = error.details[0];
        const detailMessage = firstDetail.field
          ? `${firstDetail.field}: ${firstDetail.message}`
          : firstDetail.message;
        toast.error(detailMessage);
        return;
      }

      toast.error(error instanceof Error ? error.message : 'Unable to save the NOC template.');
    }
  }

  if (postingTypesLoading && postingTypes.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading posting types...
        </CardContent>
      </Card>
    );
  }

  if (postingTypes.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No posting type masters are available yet. Add posting type masters first, then create the NOC template here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_minmax(0,1.05fr)]">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>NOC Template Editor</CardTitle>
          </div>
          <CardDescription>
            Choose the posting type master and branch scope, then define the subject and body that will be merged into the final PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Posting Type</Label>
            <SearchableSelect
              options={postingTypeOptions}
              value={selectedPostingTypeId}
              onValueChange={setSelectedPostingTypeId}
              placeholder="Select a posting type"
              searchPlaceholder="Search posting types..."
              emptyMessage="No posting type masters found."
              loadingMessage="Loading posting types..."
              isLoading={postingTypesLoading}
              contentClassName="w-[min(36rem,calc(100vw-2rem))]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="noc-template-name">Template Name</Label>
              <Input
                id="noc-template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Template display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noc-template-subject">Subject</Label>
              <Input
                id="noc-template-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Subject shown after 'Sub:'"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Branch Scope</Label>
            <SearchableSelect
              options={branchOptions}
              value={selectedBranchScope}
              onValueChange={setSelectedBranchScope}
              placeholder="Select branch scope"
              searchPlaceholder="Search branches..."
              emptyMessage="No branch masters found."
              loadingMessage="Loading branches..."
              isLoading={branchValuesQuery.isLoading}
              contentClassName="w-[min(36rem,calc(100vw-2rem))]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="noc-template-body">Template Body</Label>
              {selectedTemplate ? (
                <Badge variant="secondary">Last updated {new Date(selectedTemplate.updated_at).toLocaleDateString('en-GB')}</Badge>
              ) : null}
            </div>
            <PolicyRichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write the NOC body content here..."
            />
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Available placeholders</p>
            <p className="mt-2 leading-relaxed">
              `reference_number`, `date`, `contact_person_name`, `student_name`, `enrollment_number`, `branch`, `semester`,
              `batch`, `course`, `institute`, `program_label`, `company_name`, `company_address`, `company_city`,
              `company_state`, `company_pincode`, `role_title`, `start_date`, `end_date`
            </p>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selectedPostingType ? (
                <span>
                  Editing template for <span className="font-medium text-foreground">{selectedPostingType.value}</span>
                </span>
              ) : (
                'Select a posting type to begin.'
              )}
              <span className="ml-2">
                Scope: <span className="font-medium text-foreground">{selectedBranchScope === 'ALL' ? 'All Branches' : selectedBranchScope}</span>
              </span>
            </div>

            <Button
              type="button"
              onClick={() => setPendingSave(true)}
              disabled={upsertTemplate.isPending}
            >
              {upsertTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>
              This preview uses a sample student and request so you can see the final certificate structure while editing.
            </CardDescription>
          </CardHeader>
        </Card>

        <NocTemplatePreview
          subject={subject}
          bodyHtml={bodyHtml}
          values={previewValues}
        />
      </div>

      <ConfirmActionDialog
        open={pendingSave}
        onOpenChange={(open) => setPendingSave(open)}
        title={`Save template for "${selectedPostingType?.value ?? 'selected posting type'}"?`}
        description="This updates the live NOC certificate template used when certificates are issued."
        confirmLabel="Save Template"
        confirmVariant="default"
        isPending={upsertTemplate.isPending}
        onConfirm={() => void handleSave()}
      />
    </div>
  );
}
