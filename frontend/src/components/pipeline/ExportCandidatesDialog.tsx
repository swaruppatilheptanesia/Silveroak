import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileSpreadsheet, FileText, ShieldAlert, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Application } from '@/types/application';

interface ExportField {
  id: string;
  label: string;
  category: string;
  blocked?: boolean;
  blockReason?: string;
}

const EXPORT_FIELDS: ExportField[] = [
  // Identity
  { id: 'student_name', label: 'Full Name', category: 'Identity' },
  { id: 'enrollment_number', label: 'Enrollment Number', category: 'Identity' },
  { id: 'department', label: 'Department / Branch', category: 'Identity' },
  { id: 'batch', label: 'Batch Year', category: 'Identity' },
  // Blocked personal fields
  { id: 'email', label: 'Email Address', category: 'Personal Contact', blocked: true, blockReason: 'Blocked by university policy to prevent direct contact bypass' },
  { id: 'mobile', label: 'Phone Number', category: 'Personal Contact', blocked: true, blockReason: 'Blocked by university policy to prevent direct contact bypass' },
  { id: 'address', label: 'Personal Address', category: 'Personal Contact', blocked: true, blockReason: 'Blocked by university policy to prevent direct contact bypass' },
  // Academics
  { id: 'cgpa', label: 'CGPA', category: 'Academics' },
  { id: 'tenth_percentage', label: '10th Percentage', category: 'Academics' },
  { id: 'twelfth_percentage', label: '12th Percentage', category: 'Academics' },
  { id: 'backlog_count', label: 'Backlog Count', category: 'Academics' },
  // Application
  { id: 'current_stage', label: 'Current Stage', category: 'Application' },
  { id: 'mock_round_result', label: 'Mock Round Result', category: 'Application' },
  { id: 'applied_at', label: 'Applied Date', category: 'Application' },
  // Other
  { id: 'skills', label: 'Technical Skills', category: 'Profile' },
  { id: 'resume_link', label: 'Resume (Link)', category: 'Profile' },
  { id: 'certifications', label: 'Certifications', category: 'Profile' },
];

interface ExportCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Application[];
  selectedIds: Set<string>;
  companyName: string;
  roleName: string;
  onExportLogged: (record: ExportRecord) => void;
}

export interface ExportRecord {
  id: string;
  exportedAt: string;
  exportedBy: string;
  format: 'excel' | 'pdf';
  recordCount: number;
  fieldsIncluded: string[];
  companyName: string;
  roleName: string;
}

export function ExportCandidatesDialog({
  open,
  onOpenChange,
  applications,
  selectedIds,
  companyName,
  roleName,
  onExportLogged,
}: ExportCandidatesDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(['student_name', 'enrollment_number', 'department', 'batch', 'cgpa', 'current_stage'])
  );
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [showPreview, setShowPreview] = useState(false);

  const exportableFields = EXPORT_FIELDS.filter(f => !f.blocked);
  const blockedFields = EXPORT_FIELDS.filter(f => f.blocked);
  const categories = useMemo(() => {
    const cats = new Map<string, ExportField[]>();
    exportableFields.forEach(f => {
      if (!cats.has(f.category)) cats.set(f.category, []);
      cats.get(f.category)!.push(f);
    });
    return cats;
  }, []);

  const candidateCount = selectedIds.size > 0 ? selectedIds.size : applications.length;
  const candidatesToExport = selectedIds.size > 0
    ? applications.filter(a => selectedIds.has(a.id))
    : applications;

  const toggleField = (id: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFields(new Set(exportableFields.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFields(new Set());
  };

  const handleExport = () => {
    if (selectedFields.size === 0) {
      toast.error('Select at least one field to export');
      return;
    }

    const record: ExportRecord = {
      id: `EXP-${Date.now()}`,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Dr. Priya Mehta',
      format,
      recordCount: candidateCount,
      fieldsIncluded: Array.from(selectedFields).map(id => EXPORT_FIELDS.find(f => f.id === id)?.label || id),
      companyName,
      roleName,
    };

    onExportLogged(record);
    onOpenChange(false);
    toast.success(`Exported ${candidateCount} candidate(s) as ${format.toUpperCase()}`, {
      description: `${selectedFields.size} fields included. Exchange logged.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Candidate Data
          </DialogTitle>
          <DialogDescription>
            {companyName} — {roleName} • {candidateCount} candidate(s) {selectedIds.size > 0 ? '(selected)' : '(all)'}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] space-y-4 pr-2">
          {/* Blocked Fields Warning */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Personal Contact Data Blocked</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Per university policy, the following fields cannot be exported to prevent direct contact bypass:
                  </p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {blockedFields.map(f => (
                      <Badge key={f.id} variant="outline" className="text-destructive/70 border-destructive/30 text-xs">
                        {f.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup value={format} onValueChange={v => setFormat(v as 'excel' | 'pdf')} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="excel" id="fmt-excel" />
                <Label htmlFor="fmt-excel" className="flex items-center gap-1.5 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf" className="flex items-center gap-1.5 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-600" />
                  PDF
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Fields to Export ({selectedFields.size})</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>Clear</Button>
              </div>
            </div>

            {Array.from(categories.entries()).map(([category, fields]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{category}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {fields.map(field => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleField(field.id)}
                    >
                      <Checkbox
                        checked={selectedFields.has(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <span className="text-sm">{field.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Preview Toggle */}
          <div>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>

            {showPreview && selectedFields.size > 0 && (
              <div className="mt-2 rounded-md border overflow-auto max-h-[200px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {Array.from(selectedFields).map(id => {
                        const field = EXPORT_FIELDS.find(f => f.id === id);
                        return <th key={id} className="p-2 text-left font-medium whitespace-nowrap">{field?.label}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesToExport.slice(0, 5).map(app => (
                      <tr key={app.id} className="border-t">
                        {Array.from(selectedFields).map(id => (
                          <td key={id} className="p-2 whitespace-nowrap">
                            {(app as unknown as Record<string, unknown>)[id]?.toString() ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {candidatesToExport.length > 5 && (
                      <tr className="border-t">
                        <td colSpan={selectedFields.size} className="p-2 text-center text-muted-foreground">
                          ...and {candidatesToExport.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={selectedFields.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export {candidateCount} Candidates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
