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
import type { CreatePolicyInput, PolicyDocumentUpload } from '@/types/policy';

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

export function AddPolicyDialog({
  open,
  onOpenChange,
  onAdd,
  onUploadDocument,
  isPending = false,
  isUploadingDocument = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (policy: CreatePolicyInput) => Promise<void> | void;
  onUploadDocument: (file: File) => Promise<PolicyDocumentUpload>;
  isPending?: boolean;
  isUploadingDocument?: boolean;
}) {
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const postingTypeOptions = usePostingTypeOptions(open);
  const policyCategoryQuery = useMasterValues('policy_category', open);
  const policyCategoryValues = policyCategoryQuery.data ?? [];
  const displayedPolicyCategoryValues = policyCategoryValues.length > 0
    ? policyCategoryValues
    : [getPolicyFormDefaults().category];
  const isCategoryLoading = open && policyCategoryQuery.isLoading && policyCategoryValues.length === 0;

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      ...getPolicyFormDefaults(),
      effective_date: '',
      posting_type_master_id: GLOBAL_POSTING_TYPE,
    },
  });

  useEffect(() => {
    if (open) {
      setSelectedDocumentFile(null);
      form.reset({
        ...getPolicyFormDefaults(),
        category: displayedPolicyCategoryValues[0],
        effective_date: '',
        posting_type_master_id: GLOBAL_POSTING_TYPE,
      });
    }
  }, [form, open]);

  useEffect(() => {
    if (!open || policyCategoryValues.length === 0) {
      return;
    }

    const currentCategory = form.getValues('category');
    if (!currentCategory || !policyCategoryValues.includes(currentCategory)) {
      form.setValue('category', policyCategoryValues[0], { shouldDirty: false, shouldValidate: true });
    }
  }, [form, open, policyCategoryValues]);

  async function handleSubmit(values: PolicyFormValues) {
    const uploadedDocument = selectedDocumentFile
      ? await onUploadDocument(selectedDocumentFile)
      : null;

    await onAdd({
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
      document_url: uploadedDocument?.document_url ?? null,
      document_name: uploadedDocument?.document_name ?? null,
      document_mime_type: uploadedDocument?.document_mime_type ?? null,
      document_size: uploadedDocument?.document_size ?? null,
    });
  }

  // Student Visibility hidden per request — selector commented out below; target_* stay at default ([]).
  // const targetInstitutes = form.watch('target_institutes') ?? [];
  // const targetBranches = form.watch('target_branches') ?? [];
  // const targetCourses = form.watch('target_courses') ?? [];
  const busy = isPending || isUploadingDocument;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Policy Document</DialogTitle>
          <DialogDescription>Create a new policy or guideline in the live repository.</DialogDescription>
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
                      <Input placeholder="e.g. Campus Placement Policy 2026-27" {...field} />
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
                        {displayedPolicyCategoryValues.map((category) => (
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
                    <Textarea rows={3} placeholder="Brief summary of this policy..." {...field} />
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
                      <Input placeholder="1.0" {...field} />
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
              render={({ field }) => (
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
                      {postingTypeOptions.options.map((option) => (
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
              )}
            />

            {/*
              Student Visibility hidden per request — re-enable later. The target_* values stay at
              their defaults ([]) so the payload is unchanged (empty targets = visible to all students).
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
              disabled={busy}
              onFileChange={setSelectedDocumentFile}
              onRemove={() => setSelectedDocumentFile(null)}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploadingDocument ? 'Uploading document...' : 'Add Policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
