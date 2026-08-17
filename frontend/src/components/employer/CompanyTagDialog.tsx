import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Building2, Loader2, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useClassifyCompany } from '@/hooks/use-employer-api';
import { useToast } from '@/hooks/use-toast';
import type { ApiCompany, ApiCompanyDetail } from '@/types/employer';
import type { Company as LegacyCompany } from '@/data/mockEmployerData';

interface CompanyTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: ApiCompany | ApiCompanyDetail | LegacyCompany;
}

function getErrorMessage(error: unknown, fallback = 'Unable to update the company classification.') {
  return error instanceof Error ? error.message : fallback;
}

export default function CompanyTagDialog({ open, onOpenChange, company }: CompanyTagDialogProps) {
  const { toast } = useToast();
  const classifyCompany = useClassifyCompany();
  const [classification, setClassification] = useState<ApiCompany['classification']>(company.classification);
  const [remarks, setRemarks] = useState(('internal_remarks' in company ? company.internal_remarks : company.internalRemarks) ?? '');
  const [confirmBlacklistOpen, setConfirmBlacklistOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClassification(company.classification);
    setRemarks(('internal_remarks' in company ? company.internal_remarks : company.internalRemarks) ?? '');
    setConfirmBlacklistOpen(false);
  }, [company, open]);

  async function handleSubmit() {
    if (classification === 'blacklisted') {
      setConfirmBlacklistOpen(true);
      return;
    }

    await saveClassification();
  }

  async function saveClassification() {
    try {
      await classifyCompany.mutateAsync({
        companyId: company.id,
        data: {
          classification,
          internal_remarks: remarks.trim() || null,
        },
      });

      toast({
        title: 'Classification updated',
        description: `${company.name} is now marked as ${classification}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Unable to update classification',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function handleConfirmBlacklist() {
    setConfirmBlacklistOpen(false);
    await saveClassification();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Company Classification</DialogTitle>
          <DialogDescription>Tag {company.name} and store private admin remarks.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup
            value={classification}
            onValueChange={(value) => setClassification(value as ApiCompany['classification'])}
          >
            <div className="flex items-center space-x-3 rounded-lg border p-3">
              <RadioGroupItem value="preferred" id="preferred" />
              <Label htmlFor="preferred" className="flex flex-1 cursor-pointer items-center gap-2">
                <div className="rounded bg-green-100 p-2 dark:bg-green-900">
                  <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Preferred Partner</p>
                  <p className="text-sm text-muted-foreground">High-trust employer for future hiring cycles.</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border p-3">
              <RadioGroupItem value="normal" id="normal" />
              <Label htmlFor="normal" className="flex flex-1 cursor-pointer items-center gap-2">
                <div className="rounded bg-muted p-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Normal</p>
                  <p className="text-sm text-muted-foreground">Regular company with no special flag.</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-destructive/30 p-3">
              <RadioGroupItem value="blacklisted" id="blacklisted" />
              <Label htmlFor="blacklisted" className="flex flex-1 cursor-pointer items-center gap-2">
                <div className="rounded bg-red-100 p-2 dark:bg-red-900">
                  <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-destructive">Blacklisted</p>
                  <p className="text-sm text-muted-foreground">Restrict from future recruitment participation.</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {classification === 'blacklisted' ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                Blacklisted companies remain visible in the employer registry but should be excluded from new drives and postings.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="classification-remarks">Internal Remarks</Label>
            <Textarea
              id="classification-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Private admin notes about this classification"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={classifyCompany.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={classifyCompany.isPending}>
            {classifyCompany.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmActionDialog
        open={confirmBlacklistOpen}
        onOpenChange={setConfirmBlacklistOpen}
        title={`Blacklist ${company.name}?`}
        description="This marks the company as restricted in the employer module."
        confirmLabel="Blacklist Company"
        confirmVariant="destructive"
        isPending={classifyCompany.isPending}
        onConfirm={handleConfirmBlacklist}
      />
    </Dialog>
  );
}
