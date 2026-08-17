import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { MultiPostingForm } from '@/components/postings/MultiPostingForm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanies } from '@/hooks/use-employer-api';
import { useCreatePosting, usePublishPosting } from '@/hooks/use-posting-api';
import {
  buildCreatePostingPayload,
  buildPublishPostingPayload,
  createEmptyPostingFormValues,
  type PostingFormValues,
} from '@/lib/postingModule';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function CreatePostingSkeleton() {
  return (
    <DashboardLayout
      title="Create Posting"
      subtitle="Loading company data"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-56 bg-muted" />
            <Skeleton className="mt-3 h-4 w-72 bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[520px] w-full bg-muted" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function CreatePosting() {
  const navigate = useNavigate();
  const companiesQuery = useCompanies({
    limit: 100,
    sort_by: 'name',
    sort_order: 'asc',
  });
  const createPosting = useCreatePosting();
  const publishPosting = usePublishPosting();

  const [formSeed] = useState(() => createEmptyPostingFormValues());

  if (companiesQuery.isLoading) {
    return <CreatePostingSkeleton />;
  }

  if (companiesQuery.error) {
    return (
      <DashboardLayout
        title="Create Posting"
        subtitle="Company data could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load companies</AlertTitle>
          <AlertDescription>
            {getErrorMessage(companiesQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const companies = companiesQuery.data?.data ?? [];

  async function createBatch(values: PostingFormValues[], publish: boolean) {
    const created: Array<{ id: string }> = [];

    for (const postingValues of values) {
      const createdPosting = await createPosting.mutateAsync(buildCreatePostingPayload(postingValues));
      created.push({ id: createdPosting.id });

      if (publish) {
        await publishPosting.mutateAsync({
          postingId: createdPosting.id,
          data: buildPublishPostingPayload(postingValues),
        });
      }
    }

    return created;
  }

  async function handleCreateDraft(values: PostingFormValues[]) {
    try {
      const created = await createBatch(values, false);
      toast.success(created.length === 1 ? 'Posting created as a draft.' : `${created.length} postings created as drafts.`);
      navigate(created.length === 1 ? `/admin/postings/${created[0].id}` : '/admin/postings');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to create the posting.'));
    }
  }

  async function handleCreateAndPublish(values: PostingFormValues[]) {
    try {
      const created = await createBatch(values, true);
      toast.success(created.length === 1 ? 'Posting created and published successfully.' : `${created.length} postings created and published successfully.`);
      navigate(created.length === 1 ? `/admin/postings/${created[0].id}` : '/admin/postings');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to create the posting.'));
    }
  }

  if (companies.length === 0) {
    return (
      <DashboardLayout
        title="Create Posting"
        subtitle="At least one company is required before you can create a posting"
      >
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title="No companies available yet"
              description="Create or sync a company in the employer module first, then come back to create a posting."
            />
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <Link to="/admin/employers">Open employer module</Link>
        </Button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Create Posting"
      subtitle="Create one company drive, then add as many role rows as needed. Each role row becomes its own posting."
    >
      <MultiPostingForm
        title="Create New Posting Drive"
        subtitle="Fill the shared company details once, then add role rows. Every role row is saved as a separate posting."
        companies={companies}
        initialValues={formSeed}
        draftLabel="Create Drafts"
        draftPending={createPosting.isPending}
        onDraftAction={handleCreateDraft}
        primaryLabel="Create and Publish"
        primaryPending={createPosting.isPending || publishPosting.isPending}
        onPrimaryAction={handleCreateAndPublish}
      />
    </DashboardLayout>
  );
}
