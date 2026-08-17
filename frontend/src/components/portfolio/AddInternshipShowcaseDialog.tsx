import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Upload, Link, X, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { mockInternships } from '@/services/internshipService';

interface AddInternshipShowcaseDialogProps {
  studentId?: string;
}

export function AddInternshipShowcaseDialog({ studentId = 'STU2024001' }: AddInternshipShowcaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<'linked' | 'manual' | ''>('');
  const [linkedInternshipId, setLinkedInternshipId] = useState('');

  // Manual entry fields
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [proofFileName, setProofFileName] = useState('');

  // Available internships from Module 8 for this student
  const availableInternships = mockInternships.filter(
    (i) => i.student_id === studentId
  );

  const selectedLinked = availableInternships.find((i) => i.id === linkedInternshipId);

  const resetForm = () => {
    setSource('');
    setLinkedInternshipId('');
    setCompanyName('');
    setRole('');
    setStartDate('');
    setEndDate('');
    setDurationMonths('');
    setOutcomes(['']);
    setProofFileName('');
  };

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, '']);
  };

  const handleUpdateOutcome = (index: number, value: string) => {
    const updated = [...outcomes];
    updated[index] = value;
    setOutcomes(updated);
  };

  const handleRemoveOutcome = (index: number) => {
    if (outcomes.length <= 1) return;
    setOutcomes(outcomes.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, or WEBP files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB');
      return;
    }
    setProofFileName(file.name);
    toast.success(`File "${file.name}" selected`);
  };

  const handleSubmit = () => {
    if (source === 'linked') {
      if (!linkedInternshipId) {
        toast.error('Please select an internship record');
        return;
      }
      const filteredOutcomes = outcomes.filter((o) => o.trim());
      if (filteredOutcomes.length === 0) {
        toast.error('Please add at least one key outcome');
        return;
      }
    } else if (source === 'manual') {
      if (!companyName.trim() || !role.trim() || !startDate || !durationMonths) {
        toast.error('Please fill all required fields');
        return;
      }
      const filteredOutcomes = outcomes.filter((o) => o.trim());
      if (filteredOutcomes.length === 0) {
        toast.error('Please add at least one key outcome');
        return;
      }
    }

    if (!proofFileName) {
      toast.error('Please upload an offer letter or proof of internship');
      return;
    }

    toast.success('Internship showcase added successfully');
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Internship
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Internship Showcase</DialogTitle>
          <DialogDescription>
            Link an existing internship record or add a new entry manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Source Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">How would you like to add?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setSource('linked'); setLinkedInternshipId(''); }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  source === 'linked'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Link className="h-4 w-4 mb-1 text-primary" />
                <p className="text-sm font-medium">Link Existing</p>
                <p className="text-xs text-muted-foreground">From internship records</p>
              </button>
              <button
                type="button"
                onClick={() => setSource('manual')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  source === 'manual'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Plus className="h-4 w-4 mb-1 text-primary" />
                <p className="text-sm font-medium">Manual Entry</p>
                <p className="text-xs text-muted-foreground">Off-campus / external</p>
              </button>
            </div>
          </div>

          {/* Step 2: Linked Internship */}
          {source === 'linked' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Select Internship Record</Label>
                {availableInternships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No internship records found for your profile.</p>
                ) : (
                  <Select value={linkedInternshipId} onValueChange={setLinkedInternshipId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an internship" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInternships.map((intern) => (
                        <SelectItem key={intern.id} value={intern.id}>
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            {intern.company_name} — {intern.role}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedLinked && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <p><strong>{selectedLinked.company_name}</strong> — {selectedLinked.role}</p>
                    <p className="text-muted-foreground">
                      {selectedLinked.start_date} to {selectedLinked.end_date || 'Present'} • {selectedLinked.status}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Manual Entry */}
          {source === 'manual' && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Google India" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="role">Role / Designation *</Label>
                  <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineering Intern" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="start">Start Date *</Label>
                  <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end">End Date</Label>
                  <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Duration (months) *</Label>
                  <Input id="duration" type="number" min={1} max={24} value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} placeholder="e.g. 6" />
                </div>
              </div>
            </>
          )}

          {/* Key Outcomes — shown for both sources */}
          {source && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Key Outcomes / Learnings *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddOutcome}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                {outcomes.map((outcome, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={outcome}
                      onChange={(e) => handleUpdateOutcome(i, e.target.value)}
                      placeholder={`Outcome ${i + 1}, e.g. "Built ML pipeline improving CTR by 15%"`}
                    />
                    {outcomes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOutcome(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Proof Upload — shown for both sources */}
          {source && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Upload Offer Letter / Proof of Internship *</Label>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG, PNG, or WEBP — max 5 MB. This is required for verification.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => document.getElementById('proof-upload')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {proofFileName ? 'Change File' : 'Choose File'}
                  </Button>
                  <input
                    id="proof-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {proofFileName && (
                    <Badge variant="secondary" className="gap-1 max-w-[200px] truncate">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{proofFileName}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!source}>
            Add Internship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
