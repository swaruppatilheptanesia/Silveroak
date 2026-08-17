import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
// import { PolicyAudienceSelector } from '@/components/admin/PolicyAudienceSelector'; // Student Visibility hidden per request
import { PolicyDocumentUploadField } from '@/components/admin/PolicyDocumentUploadField';
import { PolicyRichTextEditor } from '@/components/admin/PolicyRichTextEditor';
import { getPolicyCategoryMeta, getPolicyFormDefaults, sanitizePolicyRichTextHtml } from '@/lib/policyModule';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import type { ApiPolicyDetail, PolicyDocumentUpload, UpdatePolicyInput } from '@/types/policy';

// Radix Select can't use an empty-string value, so a sentinel represents "Global / no posting type".
const GLOBAL_POSTING_TYPE = '__global__';

function hasPolicyContent(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

const policySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  category: z.string().trim().min(1, 'Category is required').max(50),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  content: z.string().refine(hasPolicyContent, 'Content is required'),
  version: z.string().trim().min(1, 'Version is required').max(20),
  effective_date: z.string().optional().or(z.literal('')),
  posting_type_master_id: z.string().optional(),
  target_institutes: z.array(z.string()).max(1).default([]),
  target_branches: z.array(z.string()).max(1).default([]),
  target_courses: z.array(z.string()).max(1).default([]),
  document_url: z.string().nullable().optional(),
  document_name: z.string().nullable().optional(),
  document_mime_type: z.string().nullable().optional(),
  document_size: z.number().nullable().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export function EditPolicyDialog({
  open,
  onOpenChange,
  policy,
  onSave,
  onUploadDocument,
  isPending = false,
  isUploadingDocument = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: ApiPolicyDetail | null;
  onSave: (policy: UpdatePolicyInput) => Promise<void> | void;
  onUploadDocument: (file: File) => Promise<PolicyDocumentUpload>;
  isPending?: boolean;
  isUploadingDocument?: boolean;
  }) {
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const postingTypeOptions = usePostingTypeOptions(open);
  const policyCategoryQuery = useMasterValues('policy_category', open);
  const policyCategoryValues = policyCategoryQuery.data ?? [];
  const isCategoryLoading = open && policyCategoryQuery.isLoading && policyCategoryValues.length === 0;

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      ...getPolicyFormDefaults(policy),
      effective_date: getPolicyFormDefaults(policy).effective_date ?? '',
      posting_type_master_id: policy?.posting_type_master_id ?? GLOBAL_POSTING_TYPE,
    },
  });

  useEffect(() => {
    setSelectedDocumentFile(null);
    form.reset({
      ...getPolicyFormDefaults(policy),
      effective_date: getPolicyFormDefaults(policy).effective_date ?? '',
      posting_type_master_id: policy?.posting_type_master_id ?? GLOBAL_POSTING_TYPE,
    });
  }, [form, policy]);

  async function handleSubmit(values: PolicyFormValues) {
    const documentFields = selectedDocumentFile
      ? await onUploadDocument(selectedDocumentFile)
      : {
          document_url: values.document_url ?? null,
          document_name: values.document_name ?? null,
          document_mime_type: values.document_mime_type ?? null,
          document_size: values.document_size ?? null,
        };

    await onSave({
      title: values.title.trim(),
      category: values.category,
      description: values.description?.trim() || null,
      content: sanitizePolicyRichTextHtml(values.content).trim(),
      version: values.version.trim(),
      effective_date: values.effective_date || null,
      posting_type_master_id:
        !values.posting_type_master_id || values.posting_type_master_id === GLOBAL_POSTING_TYPE
          ? null
          : values.posting_type_master_id,
      target_institutes: values.target_institutes,
      target_branches: values.target_branches,
      target_courses: values.target_courses,
      ...documentFields,
    });
  }

  // Student Visibility hidden per request — selector commented out below; target_* stay unchanged.
  // const targetInstitutes = form.watch('target_institutes') ?? [];
  // const targetBranches = form.watch('target_branches') ?? [];
  // const targetCourses = form.watch('target_courses') ?? [];
  const documentUrl = form.watch('document_url');
  const documentName = form.watch('document_name');
  const documentSize = form.watch('document_size');
  const busy = isPending || isUploadingDocument;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Policy Document</DialogTitle>
          <DialogDescription>Update the policy content, metadata, or version.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => void handleSubmit(values), focusFirstFormError)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={busy || isCategoryLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isCategoryLoading ? 'Loading categories...' : 'Select category'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(field.value && !policyCategoryValues.includes(field.value)
                          ? [...policyCategoryValues, field.value]
                          : policyCategoryValues
                        ).map((category) => (
                          <SelectItem key={category} value={category}>
                            {getPolicyCategoryMeta(category).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <PolicyRichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Write policy content here..."
                      disabled={busy}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="posting_type_master_id"
              render={({ field }) => {
                // The currently-linked posting type may be inactive / absent from the active
                // options list — surface it anyway so the selection stays visible.
                const options = [...postingTypeOptions.options];
                const current = policy?.posting_type_master;
                if (current && !options.some((option) => option.id === current.id)) {
                  options.push({ id: current.id, value: current.value, label: current.value });
                }
                return (
                  <FormItem>
                    <FormLabel>Posting Type</FormLabel>
                    <Select
                      value={field.value || GLOBAL_POSTING_TYPE}
                      onValueChange={field.onChange}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Global (all students)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={GLOBAL_POSTING_TYPE}>Global (all students)</SelectItem>
                        {options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Global policies must be accepted by every student at registration. Linking a posting
                      type reserves the policy for that type (not shown to students yet).
                    </p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/*
              Student Visibility hidden per request — re-enable later. The target_* values stay
              unchanged (a previously-targeted policy keeps its saved targets; empty = all students).
            <PolicyAudienceSelector
              targetInstitutes={targetInstitutes}
              targetBranches={targetBranches}
              targetCourses={targetCourses}
              onTargetInstitutesChange={(values) => form.setValue('target_institutes', values, { shouldDirty: true })}
              onTargetBranchesChange={(values) => form.setValue('target_branches', values, { shouldDirty: true })}
              onTargetCoursesChange={(values) => form.setValue('target_courses', values, { shouldDirty: true })}
            />
            */}

            <PolicyDocumentUploadField
              selectedFile={selectedDocumentFile}
              documentName={documentName}
              documentUrl={documentUrl}
              documentSize={documentSize}
              disabled={busy}
              onFileChange={setSelectedDocumentFile}
              onRemove={() => {
                setSelectedDocumentFile(null);
                form.setValue('document_url', null, { shouldDirty: true });
                form.setValue('document_name', null, { shouldDirty: true });
                form.setValue('document_mime_type', null, { shouldDirty: true });
                form.setValue('document_size', null, { shouldDirty: true });
              }}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploadingDocument ? 'Uploading document...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
