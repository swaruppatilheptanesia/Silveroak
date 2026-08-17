import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { MasterSuggestionChips } from '@/components/shared/MasterSuggestionChips';
import { RequiredLabel } from '@/components/shared/RequiredLabel';
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
import { useMasterValues } from '@/hooks/use-master-api';
import { Input } from '@/components/ui/input';
import { appendMasterValueToCsv, removeMasterValueFromCsv } from '@/lib/masterModule';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { ApiPortfolioProject, CreatePortfolioProjectInput, UpdatePortfolioProjectInput } from '@/types/portfolio';
import { formatPortfolioList, parsePortfolioList } from '@/lib/portfolioModule';

const projectSchema = z.object({
  title: z.string().trim().min(1, 'Project title is required').max(200),
  role: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  technologies: z.string().trim().optional().or(z.literal('')),
  keywords: z.string().trim().optional().or(z.literal('')),
  github_url: z.string().trim().refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Enter a valid URL').optional().or(z.literal('')),
  live_url: z.string().trim().refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Enter a valid URL').optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  is_ongoing: z.boolean().default(false),
  display_order: z.coerce.number().int().min(0, 'Display order must be 0 or greater'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

function getDefaultValues(project?: ApiPortfolioProject | null): ProjectFormValues {
  return {
    title: project?.title ?? '',
    role: project?.role ?? '',
    description: project?.description ?? '',
    technologies: formatPortfolioList(project?.technologies),
    keywords: formatPortfolioList(project?.keywords),
    github_url: project?.github_url ?? '',
    live_url: project?.live_url ?? '',
    start_date: project?.start_date?.slice(0, 10) ?? '',
    end_date: project?.end_date?.slice(0, 10) ?? '',
    is_ongoing: project?.is_ongoing ?? false,
    display_order: project?.display_order ?? 0,
  };
}

export function PortfolioProjectDialog({
  open,
  onOpenChange,
  project,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ApiPortfolioProject | null;
  isPending?: boolean;
  onSubmit: (data: CreatePortfolioProjectInput | UpdatePortfolioProjectInput) => Promise<void> | void;
}) {
  const technologyMasterValues = useMasterValues('technology');
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: getDefaultValues(project),
  });

  useEffect(() => {
    form.reset(getDefaultValues(project));
  }, [form, project, open]);

  function handleSubmit(values: ProjectFormValues) {
    return onSubmit({
      title: values.title.trim(),
      role: values.role?.trim() || null,
      description: values.description?.trim() || null,
      technologies: parsePortfolioList(values.technologies || ''),
      keywords: parsePortfolioList(values.keywords || ''),
      github_url: values.github_url?.trim() || null,
      live_url: values.live_url?.trim() || null,
      start_date: values.start_date || null,
      end_date: values.is_ongoing ? null : values.end_date || null,
      is_ongoing: values.is_ongoing,
      display_order: values.display_order,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Portfolio Project' : 'Add Portfolio Project'}</DialogTitle>
          <DialogDescription>
            Capture the project details recruiters should see in your published portfolio.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => void handleSubmit(values), focusFirstFormError)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      <RequiredLabel>Project Title</RequiredLabel>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Campus Placement Analytics Dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Full Stack Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="What did you build, why did it matter, and what was your contribution?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technologies"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Technologies</FormLabel>
                    <FormControl>
                      <Input placeholder="React, TypeScript, Node.js" {...field} />
                    </FormControl>
                    <MasterSuggestionChips
                      suggestions={technologyMasterValues.data ?? []}
                      selectedValues={parsePortfolioList(field.value || '')}
                      onSelect={(value) => field.onChange(appendMasterValueToCsv(field.value || '', value))}
                      onRemove={(value) => field.onChange(removeMasterValueFromCsv(field.value || '', value))}
                      label="Technology masters"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input placeholder="full-stack, analytics, dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="github_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="live_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Live Demo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={form.watch('is_ongoing')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_ongoing"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <FormLabel>Ongoing Project</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Turn this on if the project is still in progress.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {project ? 'Save Changes' : 'Add Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
