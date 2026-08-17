import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  GraduationCap
} from 'lucide-react';
import { mockEligibilityRules, mockAllStudents } from '@/services/studentService';
import { departments } from '@/services/studentService';
import type { EligibilityRule } from '@/types/student';
import { useToast } from '@/hooks/use-toast';

const emptyRule: Omit<EligibilityRule, 'id'> = {
  rule_name: '',
  min_cgpa: 0,
  max_backlogs: 0,
  required_branches: [],
  min_tenth_percentage: 0,
  min_twelfth_percentage: 0,
};

export default function EligibilityRulesAdmin() {
  const { toast } = useToast();
  const [rules, setRules] = useState(mockEligibilityRules);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EligibilityRule | null>(null);
  const [formData, setFormData] = useState<Omit<EligibilityRule, 'id'>>(emptyRule);

  const getMatchingStudentsCount = (rule: EligibilityRule) => {
    return mockAllStudents.filter(student => {
      const meetsGpa = !rule.min_cgpa || student.academicProfile.cgpa >= rule.min_cgpa;
      const meetsBacklogs = rule.max_backlogs === undefined || student.academicProfile.backlog_count <= rule.max_backlogs;
      const meetsBranch = !rule.required_branches?.length || rule.required_branches.includes(student.department);
      const meetsTenth = !rule.min_tenth_percentage || student.academicProfile.tenth_percentage >= rule.min_tenth_percentage;
      const meetsTwelfth = !rule.min_twelfth_percentage || (student.academicProfile.twelfth_percentage || 0) >= rule.min_twelfth_percentage;
      return meetsGpa && meetsBacklogs && meetsBranch && meetsTenth && meetsTwelfth;
    }).length;
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData(emptyRule);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: EligibilityRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      min_cgpa: rule.min_cgpa,
      max_backlogs: rule.max_backlogs,
      required_branches: rule.required_branches || [],
      min_tenth_percentage: rule.min_tenth_percentage,
      min_twelfth_percentage: rule.min_twelfth_percentage,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.rule_name.trim()) {
      toast({ title: "Error", description: "Rule name is required", variant: "destructive" });
      return;
    }

    if (editingRule) {
      setRules(prev => prev.map(r => 
        r.id === editingRule.id ? { ...r, ...formData } : r
      ));
      toast({ title: "Rule Updated", description: "Eligibility rule has been updated." });
    } else {
      const newRule: EligibilityRule = {
        id: `rule${Date.now()}`,
        ...formData,
      };
      setRules(prev => [...prev, newRule]);
      toast({ title: "Rule Created", description: "New eligibility rule has been created." });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingRule) {
      setRules(prev => prev.filter(r => r.id !== editingRule.id));
      toast({ title: "Rule Deleted", description: "Eligibility rule has been deleted." });
    }
    setDeleteDialogOpen(false);
    setEditingRule(null);
  };

  const toggleBranch = (branch: string) => {
    setFormData(prev => ({
      ...prev,
      required_branches: prev.required_branches?.includes(branch)
        ? prev.required_branches.filter(b => b !== branch)
        : [...(prev.required_branches || []), branch],
    }));
  };

  return (
    <DashboardLayout 
      title="Eligibility Rules" 
      subtitle="Define and manage eligibility criteria for placements"
    >
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <FileText className="h-3 w-3 mr-1" />
            {rules.length} Active Rules
          </Badge>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> Create Rule
        </Button>
      </div>

      {/* Rules Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3" />
                    {getMatchingStudentsCount(rule)} eligible students
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
                  <p className="text-sm text-muted-foreground mb-2">Eligible Branches:</p>
                  <div className="flex flex-wrap gap-1">
                    {rule.required_branches?.length ? (
                      rule.required_branches.map((branch) => (
                        <Badge key={branch} variant="outline" className="text-xs">
                          {branch.split(' ').map(w => w[0]).join('')}
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
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, min_cgpa: parseFloat(e.target.value) || undefined }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, max_backlogs: parseInt(e.target.value) || 0 }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, min_tenth_percentage: parseFloat(e.target.value) || undefined }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, min_twelfth_percentage: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Eligible Branches</Label>
              <p className="text-sm text-muted-foreground">Leave empty to allow all branches</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {departments.map((dept) => (
                  <div key={dept} className="flex items-center space-x-2">
                    <Checkbox
                      id={dept}
                      checked={formData.required_branches?.includes(dept)}
                      onCheckedChange={() => toggleBranch(dept)}
                    />
                    <label htmlFor={dept} className="text-sm cursor-pointer">
                      {dept}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
