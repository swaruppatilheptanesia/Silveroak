import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X, FolderKanban, Link, Github, Calendar } from 'lucide-react';
import { skillOptions } from '@/services/studentService';
import { toast } from 'sonner';
import { z } from 'zod';

const projectSchema = z.object({
  title: z.string().trim().min(1, 'Project title is required').max(100, 'Title must be under 100 characters'),
  description: z.string().trim().min(1, 'Description is required').max(500, 'Description must be under 500 characters'),
  technologies: z.array(z.string()).min(1, 'At least one technology is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  isOngoing: z.boolean(),
  projectUrl: z.string().trim().refine(val => !val || /^https?:\/\/.+/.test(val), 'Enter a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().trim().refine(val => !val || /^https?:\/\/.+/.test(val), 'Enter a valid URL').optional().or(z.literal('')),
});

interface ProjectFormData {
  title: string;
  description: string;
  technologies: string[];
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  projectUrl: string;
  githubUrl: string;
}

interface AddProjectDialogProps {
  onProjectAdd?: (project: ProjectFormData) => void;
}

export function AddProjectDialog({ onProjectAdd }: AddProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    technologies: [],
    startDate: '',
    endDate: '',
    isOngoing: false,
    projectUrl: '',
    githubUrl: '',
  });

  const totalSteps = 3;

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      technologies: [],
      startDate: '',
      endDate: '',
      isOngoing: false,
      projectUrl: '',
      githubUrl: '',
    });
    setStep(1);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const addTechnology = (tech: string) => {
    if (!formData.technologies.includes(tech)) {
      setFormData(prev => ({
        ...prev,
        technologies: [...prev.technologies, tech],
      }));
    }
  };

  const removeTechnology = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== tech),
    }));
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (currentStep: number): boolean => {
    const result = projectSchema.safeParse(formData);
    const newErrors: Record<string, string> = {};

    if (!result.success) {
      result.error.errors.forEach(err => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
    }

    if (currentStep === 1) {
      const step1Errors: Record<string, string> = {};
      if (newErrors.title) step1Errors.title = newErrors.title;
      if (newErrors.description) step1Errors.description = newErrors.description;
      setErrors(step1Errors);
      return !step1Errors.title && !step1Errors.description;
    }
    if (currentStep === 2) {
      const step2Errors: Record<string, string> = {};
      if (newErrors.technologies) step2Errors.technologies = newErrors.technologies;
      if (newErrors.startDate) step2Errors.startDate = newErrors.startDate;
      setErrors(step2Errors);
      return !step2Errors.technologies && !step2Errors.startDate;
    }
    if (currentStep === 3) {
      const step3Errors: Record<string, string> = {};
      if (newErrors.projectUrl) step3Errors.projectUrl = newErrors.projectUrl;
      if (newErrors.githubUrl) step3Errors.githubUrl = newErrors.githubUrl;
      setErrors(step3Errors);
      return !step3Errors.projectUrl && !step3Errors.githubUrl;
    }
    return true;
  };

  const canProceedStep1 = formData.title.trim().length > 0 && formData.description.trim().length > 0;
  const canProceedStep2 = formData.technologies.length > 0 && formData.startDate;

  const handleSubmit = () => {
    onProjectAdd?.(formData);
    toast.success('Project added successfully!');
    handleClose();
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Add New Project
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — {step === 1 ? 'Project Details' : step === 2 ? 'Technologies & Timeline' : 'Links (Optional)'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                placeholder="e.g., E-commerce Web Application"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={errors.title ? 'border-destructive' : ''}
                maxLength={100}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what your project does, the problem it solves, and your role..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={errors.description ? 'border-destructive' : ''}
                maxLength={500}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Technologies & Timeline */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Technologies Used *</Label>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-border rounded-lg bg-accent/30">
                {formData.technologies.length === 0 ? (
                  <span className="text-sm text-muted">Select technologies below</span>
                ) : (
                  formData.technologies.map(tech => (
                    <Badge key={tech} variant="secondary" className="gap-1 pr-1">
                      {tech}
                      <button onClick={() => removeTechnology(tech)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <Select onValueChange={addTechnology}>
                <SelectTrigger>
                  <SelectValue placeholder="Add a technology..." />
                </SelectTrigger>
                <SelectContent>
                  {skillOptions.filter(s => !formData.technologies.includes(s)).map(skill => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start Date *
                </Label>
                <Input
                  id="startDate"
                  type="month"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="month"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  disabled={formData.isOngoing}
                  placeholder={formData.isOngoing ? 'Ongoing' : ''}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="isOngoing" className="text-sm font-medium">
                  This project is ongoing
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable this if the project does not have an end date yet.
                </p>
              </div>
              <Switch
                id="isOngoing"
                checked={formData.isOngoing}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isOngoing: checked,
                    endDate: checked ? '' : prev.endDate,
                  }))
                }
              />
            </div>
          </div>
        )}

        {/* Step 3: Links (Optional) */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-accent/50 rounded-lg border border-border">
              <p className="text-sm text-muted">
                Adding links helps recruiters view your work. These fields are optional.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectUrl" className="flex items-center gap-1">
                <Link className="h-3 w-3" />
                Live Project URL
              </Label>
              <Input
                id="projectUrl"
                type="url"
                placeholder="https://your-project.com"
                value={formData.projectUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, projectUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUrl" className="flex items-center gap-1">
                <Github className="h-3 w-3" />
                GitHub Repository
              </Label>
              <Input
                id="githubUrl"
                type="url"
                placeholder="https://github.com/username/project"
                value={formData.githubUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
              />
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
              <p className="text-xs font-medium text-primary mb-2">Project Preview</p>
              <h4 className="font-semibold text-foreground">{formData.title}</h4>
              <p className="text-sm text-muted mt-1 line-clamp-2">{formData.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.technologies.slice(0, 4).map(tech => (
                  <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                ))}
                {formData.technologies.length > 4 && (
                  <Badge variant="outline" className="text-xs">+{formData.technologies.length - 4}</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
          >
            {step === totalSteps ? 'Add Project' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
