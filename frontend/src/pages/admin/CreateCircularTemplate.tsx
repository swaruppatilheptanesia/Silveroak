import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/shared/PageLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { useCreateTemplate, useTemplateDetail, useUpdateTemplate } from '@/hooks/use-circular-api';
import {
  getCircularErrorMessage,
  getCircularStatusLabel,
  getCircularStatusVariant,
  getCircularTypeLabel,
  serializeCircularFields,
  toCircularTemplateView,
  type CircularFieldDefinition,
} from '@/lib/circularModule';
import type { ApiCircularTemplateType, ApiTemplateDetail } from '@/types/circular';

type SaveMode = 'draft' | 'active';

function createNewField(section: string): CircularFieldDefinition {
  const unique = `custom_${Date.now()}`;

  return {
    id: unique,
    label: 'New Field',
    placeholder: `{{${unique}}}`,
    section,
    required: false,
    type: 'text',
  };
}

function buildTemplateLabel(type: ApiCircularTemplateType) {
  return getCircularTypeLabel(type);
}

export default function CreateCircularTemplate() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEdit = Boolean(templateId);

  const [name, setName] = useState('');
  const [type, setType] = useState<ApiCircularTemplateType>('placement');
  const [fields, setFields] = useState<CircularFieldDefinition[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [fieldPendingRemoval, setFieldPendingRemoval] = useState<{ id: string; label: string } | null>(null);

  const templateQuery = useTemplateDetail(templateId ?? '');
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const templateView = useMemo(() => {
    return templateQuery.data ? toCircularTemplateView(templateQuery.data) : null;
  }, [templateQuery.data]);

  useEffect(() => {
    if (isEdit) {
      if (!templateView || hydrated) return;

      setName(templateView.name);
      setType(templateView.type);
      setFields(templateView.fields);
      setHydrated(true);
      return;
    }

    if (hydrated) return;
    setFields(toCircularTemplateView({
      id: 'new',
      name: '',
      type,
      status: 'draft',
      sections: [],
      version: '1.0',
      used_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      created_by_user: null,
    } satisfies ApiTemplateDetail).fields);
    setHydrated(true);
  }, [hydrated, isEdit, templateView, type]);

  function updateField(fieldId: string, patch: Partial<CircularFieldDefinition>) {
    setFields((current) => current.map((field) => (
      field.id === fieldId
        ? {
            ...field,
            ...patch,
            placeholder: patch.label ? `{{${patch.label.toLowerCase().replace(/\s+/g, '_')}}}` : field.placeholder,
          }
        : field
    )));
  }

  function removeField(fieldId: string) {
    setFields((current) => current.filter((field) => field.id !== fieldId));
  }

  function addField(section: string) {
    setFields((current) => [...current, createNewField(section)]);
  }

  function handleTypeChange(nextType: ApiCircularTemplateType) {
    setType(nextType);

    if (!isEdit) {
      const nextDefaults = toCircularTemplateView({
        id: 'defaults',
        name: '',
        type: nextType,
        status: 'draft',
        sections: [],
        version: '1.0',
        used_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        created_by_user: null,
      } satisfies ApiTemplateDetail).fields;
      setFields(nextDefaults);
    }
  }

  async function handleSave(mode: SaveMode) {
    if (!name.trim()) {
      toast.error('Template name is required.');
      return;
    }

    if (fields.length === 0) {
      toast.error('Add at least one field before saving.');
      return;
    }

    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();
    fields.forEach((field) => {
      if (seenIds.has(field.id)) {
        duplicateIds.add(field.id);
      }
      seenIds.add(field.id);
    });

    if (duplicateIds.size > 0) {
      toast.error('Field identifiers must be unique.');
      return;
    }

    try {
      if (isEdit && templateId) {
        await updateTemplate.mutateAsync({
          templateId,
          data: {
            name: name.trim(),
            type,
            sections: serializeCircularFields(fields),
            status: mode,
          },
        });
        toast.success(mode === 'active' ? 'Template updated and activated.' : 'Template saved as draft.');
      } else {
        const created = await createTemplate.mutateAsync({
          name: name.trim(),
          type,
          sections: serializeCircularFields(fields),
        });

        if (mode === 'active') {
          await updateTemplate.mutateAsync({
            templateId: created.id,
            data: { status: 'active' },
          });
        }

        toast.success(mode === 'active' ? 'Template created and activated.' : 'Template saved as draft.');
      }

      navigate('/admin/circulars');
    } catch (error) {
      toast.error(getCircularErrorMessage(error, 'Unable to save the template.'));
    }
  }

  if (isEdit && templateQuery.isLoading) {
    return (
      <DashboardLayout
        title="Circular Template"
        subtitle="Loading template details"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (isEdit && templateQuery.error) {
    return (
      <DashboardLayout
        title="Circular Template"
        subtitle="Loading template details"
      >
        <Alert variant="destructive">
          <Save className="h-4 w-4" />
          <AlertTitle>Unable to load the template</AlertTitle>
          <AlertDescription>
            {getCircularErrorMessage(templateQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={isEdit ? 'Edit Circular Template' : 'Create Circular Template'}
      subtitle="Define the structure and fields used while generating live circulars"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/circulars')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              {isEdit ? 'Edit Template' : 'New Template'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Build reusable circular templates and preview them before saving.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowPreview((current) => !current)}>
            {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showPreview ? 'Hide Preview' : 'Live Preview'}
          </Button>
        </div>

        <div className={`grid gap-6 ${showPreview ? 'xl:grid-cols-[1.2fr_0.8fr]' : 'max-w-4xl'}`}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Campus Drive Circular"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(value) => handleTypeChange(value as ApiCircularTemplateType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placement">Placement</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="campus_drive">Campus Drive</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isEdit && templateView ? (
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                        <Badge variant={getCircularStatusVariant(templateView.status)}>
                          {getCircularStatusLabel(templateView.status)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">v{templateView.version}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => (
                  <Card key={field.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                        <div className="space-y-2">
                          <Label>Field Label</Label>
                          <Input
                            value={field.label}
                            onChange={(event) => updateField(field.id, { label: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Section</Label>
                          <Select value={field.section} onValueChange={(value) => updateField(field.id, { section: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['Company Details', 'Role & Profile', 'Eligibility Criteria', 'Compensation', 'Selection Process', 'Schedule & Venue', 'Bond Policy', 'Instructions & Notes'].map((section) => (
                                <SelectItem key={section} value={section}>
                                  {section}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFieldPendingRemoval({ id: field.id, label: field.label || 'this field' })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Field Type</Label>
                          <Select value={field.type} onValueChange={(value) => updateField(field.id, { type: value as CircularFieldDefinition['type'] })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Text Area</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="list">List</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder}
                            onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Default Value</Label>
                          <Input
                            value={field.defaultValue ?? ''}
                            onChange={(event) => updateField(field.id, { defaultValue: event.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Help Text</Label>
                          <Input
                            value={field.helpText ?? ''}
                            onChange={(event) => updateField(field.id, { helpText: event.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                        />
                        <div>
                          <p className="text-sm font-medium">Required field</p>
                          <p className="text-xs text-muted-foreground">
                            This value must be filled while generating the circular.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" onClick={() => addField('Instructions & Notes')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => navigate('/admin/circulars')}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => void handleSave('draft')} disabled={createTemplate.isPending || updateTemplate.isPending}>
                {createTemplate.isPending || updateTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Draft
              </Button>
              <Button onClick={() => void handleSave('active')} disabled={createTemplate.isPending || updateTemplate.isPending}>
                {createTemplate.isPending || updateTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEdit ? 'Update & Activate' : 'Save & Activate'}
              </Button>
            </div>
          </div>

          {showPreview ? (
            <Card className="self-start xl:sticky xl:top-4">
              <CardHeader>
                <CardTitle className="text-base">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="font-semibold text-foreground">{name.trim() || 'Untitled Template'}</p>
                  <p className="text-sm text-muted-foreground">{buildTemplateLabel(type)} Template</p>
                </div>

                {fields.map((field) => (
                  <Card key={field.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">
                          {field.label}
                          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                        </p>
                        <Badge variant="secondary">{field.section}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{field.placeholder}</p>
                      {field.defaultValue ? (
                        <p className="text-sm text-foreground">Default: {field.defaultValue}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmActionDialog
        open={Boolean(fieldPendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setFieldPendingRemoval(null);
        }}
        title={fieldPendingRemoval ? `Remove "${fieldPendingRemoval.label}"?` : 'Remove field?'}
        description="This field will be removed from the template. Any existing circulars generated from this template are unaffected."
        confirmLabel="Remove field"
        confirmVariant="destructive"
        onConfirm={() => {
          if (fieldPendingRemoval) {
            removeField(fieldPendingRemoval.id);
            setFieldPendingRemoval(null);
          }
        }}
      />
    </DashboardLayout>
  );
}
