import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  FileText,
  GraduationCap,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminEligibilityRules,
  useCreateAdminEligibilityRule,
  useDeleteAdminEligibilityRule,
  useUpdateAdminEligibilityRule,
} from '@/hooks/use-admin-api';
import { policyKeys, usePolicyInstituteOptions } from '@/hooks/use-policy-api';
import { policyService } from '@/services/policyService';
import { mergeMasterValues } from '@/lib/masterModule';
import type { ApiAdminEligibilityRule, CreateAdminEligibilityRuleInput } from '@/types/admin';

type RuleFormData = CreateAdminEligibilityRuleInput;

const emptyRule: RuleFormData = {
  rule_name: '',
  min_cgpa: 0,
  max_backlogs: 0,
  required_branches: [],
  min_tenth_percentage: 0,
  min_twelfth_percentage: 0,
};

export default function EligibilityRulesTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApiAdminEligibilityRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyRule);
  // CRM branch cascade (Institute → Course → Branch): pick a course to load its ERP branches.
  const [scopeInstituteId, setScopeInstituteId] = useState<number | null>(null);
  const [scopeCourseId, setScopeCourseId] = useState<number | null>(null);

  const rulesQuery = useAdminEligibilityRules();
  const institutesQuery = usePolicyInstituteOptions();
  const coursesQuery = useQuery({
    queryKey: policyKeys.courses(scopeInstituteId),
    queryFn: () => policyService.getCourseOptions(scopeInstituteId as number),
    enabled: scopeInstituteId != null,
  });
  const branchesQuery = useQuery({
    queryKey: policyKeys.branches(scopeCourseId),
    queryFn: () => policyService.getBranchOptions(scopeCourseId as number),
    enabled: scopeCourseId != null,
  });
  const createRuleMutation = useCreateAdminEligibilityRule();
  const updateRuleMutation = useUpdateAdminEligibilityRule();
  const deleteRuleMutation = useDeleteAdminEligibilityRule();

  const rules = rulesQuery.data ?? [];
  // Branch options = the selected course's CRM branches, merged with any already-selected branches
  // (which may span multiple courses) so cross-course selections stay visible and removable.
  const availableBranchOptions = useMemo(
    () => mergeMasterValues((branchesQuery.data ?? []).map((option) => option.name), formData.required_branches),
    [branchesQuery.data, formData.required_branches],
  );

  const resetScopeCascade = () => {
    setScopeInstituteId(null);
    setScopeCourseId(null);
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData(emptyRule);
    resetScopeCascade();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: ApiAdminEligibilityRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      min_cgpa: rule.min_cgpa ?? 0,
      max_backlogs: rule.max_backlogs,
      required_branches: rule.required_branches || [],
      min_tenth_percentage: rule.min_tenth_percentage ?? 0,
      min_twelfth_percentage: rule.min_twelfth_percentage ?? 0,
    });
    resetScopeCascade();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.rule_name?.trim()) {
      toast({ title: 'Error', description: 'Rule name is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingRule) {
        await updateRuleMutation.mutateAsync({
          ruleId: editingRule.id,
          data: formData,
        });
        toast({ title: 'Rule Updated', description: 'Eligibility rule has been updated.' });
      } else {
        await createRuleMutation.mutateAsync(formData);
        toast({ title: 'Rule Created', description: 'New eligibility rule has been created.' });
      }
      setIsDialogOpen(false);
      setEditingRule(null);
      setFormData(emptyRule);
      resetScopeCascade();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Unable to save this eligibility rule right now.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!editingRule) {
      return;
    }

    try {
      await deleteRuleMutation.mutateAsync(editingRule.id);
      toast({ title: 'Rule Deleted', description: 'Eligibility rule has been deleted.' });
      setDeleteDialogOpen(false);
      setEditingRule(null);
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Unable to delete this eligibility rule right now.',
        variant: 'destructive',
      });
    }
  };

  const toggleBranch = (branch: string) => {
    setFormData((current) => ({
      ...current,
      required_branches: current.required_branches?.includes(branch)
        ? current.required_branches.filter((item) => item !== branch)
        : [...(current.required_branches || []), branch],
    }));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <FileText className="mr-1 h-3 w-3" />
            {rules.length} Active Rules
          </Badge>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Rule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rulesQuery.isLoading ? (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-muted-foreground">Loading eligibility rules...</CardContent>
          </Card>
        ) : rules.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-muted-foreground">
              No eligibility rules found yet.
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {rule.eligible_students_count} eligible students
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setEditingRule(rule);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>Min CGPA: <strong>{rule.min_cgpa || 'Any'}</strong></span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Backlogs:</span>{' '}
                      <strong>{rule.max_backlogs ?? 'Any'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min 10th:</span>{' '}
                      <strong>{rule.min_tenth_percentage ? `${rule.min_tenth_percentage}%` : 'Any'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min 12th:</span>{' '}
                      <strong>{rule.min_twelfth_percentage ? `${rule.min_twelfth_percentage}%` : 'Any'}</strong>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Eligible Branches:</p>
                    <div className="flex flex-wrap gap-1">
                      {rule.required_branches?.length ? (
                        rule.required_branches.map((branch) => (
                          <Badge key={branch} variant="outline" className="text-xs">
                            {branch.split(' ').map((word) => word[0]).join('')}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">All Branches</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
            <DialogDescription>
              Define eligibility criteria for this placement opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule_name">Rule Name *</Label>
              <Input
                id="rule_name"
                placeholder="e.g., TCS Digital, Google STEP"
                value={formData.rule_name}
                onChange={(event) => setFormData((current) => ({ ...current, rule_name: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_cgpa">Minimum CGPA</Label>
                <Input
                  id="min_cgpa"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="e.g., 7.5"
                  value={formData.min_cgpa || ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      min_cgpa: parseFloat(event.target.value) || undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_backlogs">Maximum Backlogs Allowed</Label>
                <Input
                  id="max_backlogs"
                  type="number"
                  min="0"
                  placeholder="e.g., 0"
                  value={formData.max_backlogs ?? ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      max_backlogs: parseInt(event.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_tenth">Minimum 10th Percentage</Label>
                <Input
                  id="min_tenth"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g., 60"
                  value={formData.min_tenth_percentage || ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      min_tenth_percentage: parseFloat(event.target.value) || undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_twelfth">Minimum 12th Percentage</Label>
                <Input
                  id="min_twelfth"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g., 60"
                  value={formData.min_twelfth_percentage || ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      min_twelfth_percentage: parseFloat(event.target.value) || undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Eligible Branches</Label>
                <p className="text-sm text-muted-foreground">
                  Leave empty to allow all branches. Pick an Institute → Course to load its ERP branches, then
                  select the branches to include. Selections can span multiple courses.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scope_institute">Institute</Label>
                  <Select
                    value={scopeInstituteId != null ? String(scopeInstituteId) : undefined}
                    onValueChange={(value) => {
                      setScopeInstituteId(Number(value));
                      setScopeCourseId(null);
                    }}
                  >
                    <SelectTrigger id="scope_institute">
                      <SelectValue placeholder="Select institute" />
                    </SelectTrigger>
                    <SelectContent>
                      {(institutesQuery.data ?? []).map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope_course">Course</Label>
                  <Select
                    value={scopeCourseId != null ? String(scopeCourseId) : undefined}
                    onValueChange={(value) => setScopeCourseId(Number(value))}
                    disabled={scopeInstituteId == null || coursesQuery.isLoading}
                  >
                    <SelectTrigger id="scope_course">
                      <SelectValue placeholder={scopeInstituteId == null ? 'Select institute first' : 'Select course'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(coursesQuery.data ?? []).map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {scopeCourseId == null ? (
                <p className="text-sm text-muted-foreground">Select a course to list its branches.</p>
              ) : branchesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading branches…</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {availableBranchOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No branches found for this course.</p>
                  ) : (
                    availableBranchOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={(formData.required_branches ?? []).includes(option)}
                          onChange={() => toggleBranch(option)}
                        />
                        {option}
                      </label>
                    ))
                  )}
                </div>
              )}

              {(formData.required_branches?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Selected branches:</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.required_branches?.map((branch) => (
                      <Badge
                        key={branch}
                        variant="secondary"
                        className="cursor-pointer text-xs"
                        onClick={() => toggleBranch(branch)}
                        title="Click to remove"
                      >
                        {branch} ✕
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Eligibility Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the rule "{editingRule?.rule_name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
