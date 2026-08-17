import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { mockOffers } from '@/services/offerService';
import { mockInternships } from '@/services/internshipService';
import {
  INTERNSHIP_TYPE_CONFIG, MINIMUM_STIPEND_AMOUNT,
  type InternshipType,
} from '@/types/internship';
import type { Offer } from '@/types/offer';

interface ImportFromOffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportFromOffersDialog({ open, onOpenChange }: ImportFromOffersDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Common details for bulk apply
  const [commonStartDate, setCommonStartDate] = useState('');
  const [commonEndDate, setCommonEndDate] = useState('');
  const [commonType, setCommonType] = useState<InternshipType | ''>('');
  const [commonStipendAmount, setCommonStipendAmount] = useState('');

  // Per-row overrides
  const [rowOverrides, setRowOverrides] = useState<Record<string, {
    start_date?: string;
    end_date?: string;
    internship_type?: InternshipType;
    stipend_amount?: string;
  }>>({});

  // Get accepted internship offers that don't already have an internship record
  const linkedOfferIds = new Set(mockInternships.map(i => i.offer_id));
  const importableOffers = useMemo(() => {
    let list = mockOffers.filter(o =>
      o.type === 'internship' &&
      o.status === 'accepted' &&
      !linkedOfferIds.has(o.id)
    );

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        o.student_name.toLowerCase().includes(q) ||
        o.enrollment_number.toLowerCase().includes(q) ||
        o.company_name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchTerm, linkedOfferIds]);

  const allSelected = importableOffers.length > 0 && importableOffers.every(o => selectedIds.has(o.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(importableOffers.map(o => o.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const getRowValue = (offerId: string, field: 'start_date' | 'end_date' | 'internship_type' | 'stipend_amount') => {
    const override = rowOverrides[offerId]?.[field];
    if (override !== undefined && override !== '') return override;
    if (field === 'start_date') return commonStartDate;
    if (field === 'end_date') return commonEndDate;
    if (field === 'internship_type') return commonType;
    if (field === 'stipend_amount') return commonStipendAmount;
    return '';
  };

  const updateRowOverride = (offerId: string, field: string, value: string) => {
    setRowOverrides(prev => ({
      ...prev,
      [offerId]: { ...prev[offerId], [field]: value },
    }));
  };

  const applyCommonToAll = () => {
    // Clear all overrides so common values apply
    setRowOverrides({});
    toast.success('Common details applied to all selected rows');
  };

  const validate = (): string | null => {
    if (selectedIds.size === 0) return 'Select at least one offer to import.';

    for (const id of selectedIds) {
      const offer = importableOffers.find(o => o.id === id);
      if (!offer) continue;

      const startDate = getRowValue(id, 'start_date');
      const endDate = getRowValue(id, 'end_date');
      const type = getRowValue(id, 'internship_type') as InternshipType;
      const stipendAmt = getRowValue(id, 'stipend_amount');

      if (!startDate || !endDate) return `Start and end dates are required for ${offer.student_name}.`;
      if (new Date(endDate) <= new Date(startDate)) return `End date must be after start date for ${offer.student_name}.`;
      if (!type) return `Internship type is required for ${offer.student_name}.`;
      if (type === 'stipend_based') {
        const amt = Number(stipendAmt);
        if (!stipendAmt || isNaN(amt) || amt <= 0) return `Stipend amount is required for ${offer.student_name} (stipend-based).`;
        if (amt < MINIMUM_STIPEND_AMOUNT) return `Stipend for ${offer.student_name} must be at least ₹${MINIMUM_STIPEND_AMOUNT.toLocaleString('en-IN')}/month.`;
      }
    }
    return null;
  };

  const handleImport = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    toast.success(`${selectedIds.size} internship record(s) created successfully`);
    setSelectedIds(new Set());
    setRowOverrides({});
    setCommonStartDate('');
    setCommonEndDate('');
    setCommonType('');
    setCommonStipendAmount('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchTerm('');
    setRowOverrides({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Import from Accepted Offers
          </DialogTitle>
          <DialogDescription>
            Select accepted internship offers to create internship records. {importableOffers.length} importable offer(s) found.
          </DialogDescription>
        </DialogHeader>

        {importableOffers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No importable offers found.</p>
            <p className="text-xs mt-1">All accepted internship offers already have linked records.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Common Details Section */}
            {selectedIds.size > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Set Common Details ({selectedIds.size} selected)</p>
                    <Button size="sm" variant="outline" onClick={applyCommonToAll}>Apply to All</Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={commonStartDate} onChange={e => setCommonStartDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">End Date</Label>
                      <Input type="date" value={commonEndDate} onChange={e => setCommonEndDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={commonType} onValueChange={(v) => setCommonType(v as InternshipType)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(INTERNSHIP_TYPE_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Stipend (₹/mo)</Label>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={commonStipendAmount}
                        onChange={e => setCommonStipendAmount(e.target.value)}
                        className="h-8 text-sm"
                        min={0}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by student, company..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Company & Role</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stipend (₹/mo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importableOffers.map(offer => {
                    const isSelected = selectedIds.has(offer.id);
                    const rowType = getRowValue(offer.id, 'internship_type') as InternshipType;
                    const rowStipend = getRowValue(offer.id, 'stipend_amount');
                    const belowMin = rowType === 'stipend_based' && rowStipend && Number(rowStipend) < MINIMUM_STIPEND_AMOUNT;

                    return (
                      <TableRow key={offer.id} className={isSelected ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(offer.id)} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{offer.student_name}</p>
                            <p className="text-xs text-muted-foreground">{offer.enrollment_number} • {offer.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{offer.company_name}</p>
                            <p className="text-xs text-muted-foreground">{offer.role}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={getRowValue(offer.id, 'start_date')}
                            onChange={e => updateRowOverride(offer.id, 'start_date', e.target.value)}
                            className="h-8 text-xs w-36"
                            disabled={!isSelected}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={getRowValue(offer.id, 'end_date')}
                            onChange={e => updateRowOverride(offer.id, 'end_date', e.target.value)}
                            className="h-8 text-xs w-36"
                            disabled={!isSelected}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={getRowValue(offer.id, 'internship_type') || undefined}
                            onValueChange={v => updateRowOverride(offer.id, 'internship_type', v)}
                            disabled={!isSelected}
                          >
                            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(INTERNSHIP_TYPE_CONFIG).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              placeholder="₹"
                              value={getRowValue(offer.id, 'stipend_amount')}
                              onChange={e => updateRowOverride(offer.id, 'stipend_amount', e.target.value)}
                              className="h-8 text-xs w-24"
                              disabled={!isSelected || rowType === 'unpaid'}
                              min={0}
                            />
                            {belowMin && (
                              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={selectedIds.size === 0}>
            Create {selectedIds.size > 0 ? `${selectedIds.size} Record(s)` : 'Records'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
