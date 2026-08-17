import { useDeferredValue, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Building2,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  ShieldX,
  Users,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRecruiters, useVerifyRecruiter } from '@/hooks/use-employer-api';
import type { ApiRecruiterListItem } from '@/types/employer';

const RecruiterManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<ApiRecruiterListItem | null>(null);
  const [verificationRemarks, setVerificationRemarks] = useState('');

  const deferredSearch = useDeferredValue(searchTerm);
  const verificationStatus = statusFilter === 'all'
    ? undefined
    : (statusFilter as 'pending' | 'verified' | 'rejected');

  const recruitersQuery = useRecruiters({
    page: 1,
    limit: 1000,
    search: deferredSearch || undefined,
    verification_status: verificationStatus,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const totalQuery = useRecruiters({ page: 1, limit: 1 });
  const verifiedQuery = useRecruiters({ page: 1, limit: 1, verification_status: 'verified' });
  const pendingQuery = useRecruiters({ page: 1, limit: 1, verification_status: 'pending' });
  const verifyRecruiter = useVerifyRecruiter();

  const recruiters = recruitersQuery.data?.data ?? [];

  const stats = useMemo(() => ({
    total: totalQuery.data?.pagination.total ?? 0,
    verified: verifiedQuery.data?.pagination.total ?? 0,
    pending: pendingQuery.data?.pagination.total ?? 0,
  }), [
    pendingQuery.data?.pagination.total,
    totalQuery.data?.pagination.total,
    verifiedQuery.data?.pagination.total,
  ]);

  const getStatusBadge = (status: ApiRecruiterListItem['verification_status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
  };

  const openReview = (recruiter: ApiRecruiterListItem) => {
    setSelectedRecruiter(recruiter);
    setVerificationRemarks('');
    setVerifyDialogOpen(true);
  };

  const handleVerificationAction = async (status: 'verified' | 'rejected') => {
    if (!selectedRecruiter) return;

    try {
      await verifyRecruiter.mutateAsync({
        recruiterId: selectedRecruiter.id,
        data: { status },
      });

      toast({
        title: status === 'verified' ? 'Recruiter Verified' : 'Recruiter Rejected',
        description: `${selectedRecruiter.name} has been ${status === 'verified' ? 'verified' : 'rejected'} in the live recruiter registry.`,
      });
      setVerifyDialogOpen(false);
      setSelectedRecruiter(null);
      setVerificationRemarks('');
    } catch (error) {
      toast({
        title: 'Unable to update recruiter',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruiter Management</h1>
          <p className="text-muted-foreground">Verify and manage recruiter accounts</p>
        </div>

        {recruitersQuery.error ? (
          <Alert variant="destructive">
            <Users className="h-4 w-4" />
            <AlertTitle>Unable to load recruiters</AlertTitle>
            <AlertDescription>
              {(recruitersQuery.error instanceof Error ? recruitersQuery.error.message : null) || 'Please refresh and try again.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Recruiters</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Verification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Verification Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Recruiters Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recruiters ({recruitersQuery.data?.pagination.total ?? recruiters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recruitersQuery.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading live recruiter records...
              </div>
            ) : recruiters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No recruiters found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruiters.map((recruiter) => (
                    <TableRow key={recruiter.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium text-sm">
                              {recruiter.name.split(' ').map((name) => name[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{recruiter.name}</p>
                            <p className="text-sm text-muted-foreground">{recruiter.designation || 'No designation'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {recruiter.company.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {recruiter.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {recruiter.phone || 'No phone added'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(recruiter.verification_status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openReview(recruiter)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recruiter Verification</DialogTitle>
            <DialogDescription>
              Review the recruiter details before approving or rejecting the account.
            </DialogDescription>
          </DialogHeader>
          {selectedRecruiter && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedRecruiter.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span>{selectedRecruiter.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span>{selectedRecruiter.company.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Designation</span>
                  <span>{selectedRecruiter.designation || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Status</span>
                  {getStatusBadge(selectedRecruiter.verification_status)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Verification Notes</Label>
                <Textarea
                  id="remarks"
                  placeholder="Optional notes for your review session"
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Add notes here for your own review context if needed.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => handleVerificationAction('rejected')}
              disabled={verifyRecruiter.isPending}
            >
              {verifyRecruiter.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={() => handleVerificationAction('verified')}
              disabled={verifyRecruiter.isPending}
            >
              {verifyRecruiter.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RecruiterManagement;
