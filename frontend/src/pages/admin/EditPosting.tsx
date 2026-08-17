import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { PostingForm } from '@/components/postings/PostingForm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanies } from '@/hooks/use-employer-api';
import { usePostingDetail, usePublishPosting, useUpdatePosting } from '@/hooks/use-posting-api';
import {
  buildPublishPostingPayload,
  buildUpdatePostingPayload,
  postingDetailToFormValues,
} from '@/lib/postingModule';
import type { ApiCompany } from '@/types/employer';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function EditPostingSkeleton() {
  return (
    <DashboardLayout
      title="Edit Posting"
      subtitle="Loading posting and company data"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-48 bg-muted" />
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

export default function EditPosting() {
  const { postingId } = useParams();
  const navigate = useNavigate();

  const postingQuery = usePostingDetail(postingId ?? '');
  const companiesQuery = useCompanies({
    limit: 100,
    sort_by: 'name',
    sort_order: 'asc',
  });
  const updatePosting = useUpdatePosting();
  const publishPosting = usePublishPosting();

  const posting = postingQuery.data;
  const companyOptions = useMemo(() => {
    const liveCompanies = companiesQuery.data?.data ?? [];

    if (!posting) return liveCompanies;
    if (liveCompanies.some((company) => company.id === posting.company.id)) {
      return liveCompanies;
    }

    const fallbackCompany: ApiCompany = {
      id: posting.company.id,
      name: posting.company.name,
      industry: posting.company.industry,
      website: null,
      address: null,
      description: null,
      status: 'active',
      classification: 'normal',
      internal_remarks: null,
      tenant_id: '',
      created_at: posting.created_at,
    };

    return [fallbackCompany, ...liveCompanies];
  }, [companiesQuery.data?.data, posting]);

  if (postingQuery.isLoading || companiesQuery.isLoading) {
    return <EditPostingSkeleton />;
  }

  if (postingQuery.error || !posting) {
    return (
      <DashboardLayout
        title="Edit Posting"
        subtitle="The requested posting could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load posting</AlertTitle>
          <AlertDescription>
            {getErrorMessage(postingQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (posting.status === 'closed') {
    return (
      <DashboardLayout
        title="Edit Posting"
        subtitle="Closed postings are read-only"
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Cannot edit a closed posting</h2>
              <p className="mt-2 text-muted-foreground">
                Closed postings can no longer be changed. You can still review the posting details.
              </p>
            </div>
            <Button onClick={() => navigate(`/admin/postings/${posting.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Posting
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const initialValues = postingDetailToFormValues(posting);
  const isDraft = posting.status === 'draft';

  async function handleSave(values: typeof initialValues) {
    try {
      await updatePosting.mutateAsync({
        postingId: posting.id,
        data: buildUpdatePostingPayload(values),
      });
      toast.success('Posting changes saved.');
      navigate(`/admin/postings/${posting.id}`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to save the posting.'));
    }
  }

  async function handleSaveAndPublish(values: typeof initialValues) {
    try {
      await updatePosting.mutateAsync({
        postingId: posting.id,
        data: buildUpdatePostingPayload(values),
      });

      try {
        await publishPosting.mutateAsync({
          postingId: posting.id,
          data: buildPublishPostingPayload(values),
        });
        toast.success('Posting updated and published successfully.');
      } catch (error) {
        toast.error(`Changes saved, but publish failed: ${getErrorMessage(error)}`);
      }

      navigate(`/admin/postings/${posting.id}`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to save the posting.'));
    }
  }

  return (
    <DashboardLayout
      title="Edit Posting"
      subtitle="Update the posting details and keep the opportunity current"
    >
      <div className="space-y-6">
        {companiesQuery.error && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Company list refresh failed</AlertTitle>
            <AlertDescription>
              {getErrorMessage(companiesQuery.error, 'The current company selection is still preserved for editing.')}
            </AlertDescription>
          </Alert>
        )}

        <PostingForm
          title={`Edit ${posting.title}`}
          subtitle="Review and update the posting information below."
          companies={companyOptions}
          initialValues={initialValues}
          status={posting.status}
          disableCompanySelection
          draftLabel={isDraft ? 'Save Draft' : undefined}
          draftPending={updatePosting.isPending}
          onDraftAction={isDraft ? handleSave : undefined}
          primaryLabel={isDraft ? 'Save and Publish' : 'Save Changes'}
          primaryPending={updatePosting.isPending || publishPosting.isPending}
          onPrimaryAction={isDraft ? handleSaveAndPublish : handleSave}
        />
      </div>
    </DashboardLayout>
  );
}
