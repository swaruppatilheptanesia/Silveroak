import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  FileCheck,
  GraduationCap,
  IndianRupee,
  Loader2,
  Plus,
} from 'lucide-react';
import { useMyInternships } from '@/hooks/use-internship-api';
import {
  getInternshipDaysRemaining,
  getInternshipOpenIssueCount,
  isInternshipCertificatePending,
} from '@/lib/internshipModule';
import {
  INTERNSHIP_STATUS_CONFIG,
  INTERNSHIP_TYPE_CONFIG,
  type ApiMyInternship,
} from '@/types/internship';
import { CreateInternshipDialog } from '@/components/internships/CreateInternshipDialog';
import { InternshipDetailSheet } from '@/components/internships/InternshipDetailSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StudentInternshipsTabProps {
  studentId?: string;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function StudentInternshipCard({
  internship,
  onView,
}: {
  internship: ApiMyInternship;
  onView: (internshipId: string) => void;
}) {
  const daysRemaining = getInternshipDaysRemaining(internship);
  const openIssueCount = getInternshipOpenIssueCount(internship);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-6">
        {isInternshipCertificatePending(internship) && internship.status === 'ongoing' && daysRemaining !== null && daysRemaining <= 25 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">
            Certificate reminder: this internship ends in {daysRemaining} day{daysRemaining === 1 ? '' : 's'} and the completion proof is still pending.
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {internship.company_name}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{internship.role}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className={INTERNSHIP_STATUS_CONFIG[internship.status].color} variant="outline">
                  {INTERNSHIP_STATUS_CONFIG[internship.status].label}
                </Badge>
                <Badge className={INTERNSHIP_TYPE_CONFIG[internship.internship_type].color} variant="outline">
                  {INTERNSHIP_TYPE_CONFIG[internship.internship_type].label}
                </Badge>
                {openIssueCount > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
                    {openIssueCount} open issue{openIssueCount === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(internship.start_date), 'dd MMM yyyy')}
                {internship.end_date ? ` - ${format(new Date(internship.end_date), 'dd MMM yyyy')}` : ''}
              </span>
              {internship.stipend_amount !== null && internship.is_receiving_stipend && (
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {internship.stipend_amount.toLocaleString('en-IN')}
                  {internship.stipend_frequency ? ` / ${internship.stipend_frequency.replace('_', ' ')}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <div className="text-xs text-muted-foreground">
              {internship.certificate_uploaded ? 'Certificate uploaded' : 'Certificate pending'}
            </div>
            <Button variant="outline" size="sm" onClick={() => onView(internship.id)}>
              View details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentInternshipsTab({ studentId: _studentId }: StudentInternshipsTabProps) {
  const internshipsQuery = useMyInternships();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(null);

  const internships = internshipsQuery.data ?? [];
  const linkedOfferIds = useMemo(
    () => internships.map((internship) => internship.offer_id).filter(Boolean) as string[],
    [internships]
  );
  const stats = useMemo(() => {
    return {
      total: internships.length,
      ongoing: internships.filter((internship) => internship.status === 'ongoing').length,
      openIssues: internships.reduce((count, internship) => count + getInternshipOpenIssueCount(internship), 0),
      certificatePending: internships.filter(isInternshipCertificatePending).length,
    };
  }, [internships]);

  if (internshipsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading internship records...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {internshipsQuery.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load internships</AlertTitle>
          <AlertDescription>
            {getErrorMessage(internshipsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total records</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.ongoing}</p>
              <p className="text-xs text-muted-foreground">Ongoing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.openIssues}</p>
              <p className="text-xs text-muted-foreground">Open issues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-semibold">{stats.certificatePending}</p>
              <p className="text-xs text-muted-foreground">Certificate pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add internship
        </Button>
      </div>

      {internships.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={GraduationCap}
              title="No internship records yet"
              description="Create your first internship entry to track stipend status, certificates, and issue reporting."
              actionLabel="Add internship"
              onAction={() => setDialogOpen(true)}
              compact
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {internships.map((internship) => (
            <StudentInternshipCard
              key={internship.id}
              internship={internship}
              onView={setSelectedInternshipId}
            />
          ))}
        </div>
      )}

      <CreateInternshipDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        linkedOfferIds={linkedOfferIds}
      />

      <InternshipDetailSheet
        internshipId={selectedInternshipId}
        open={Boolean(selectedInternshipId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedInternshipId(null);
        }}
        canCreateIssues
      />
    </div>
  );
}
