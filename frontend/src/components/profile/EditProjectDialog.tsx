import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, FolderKanban, Link, Github, Calendar } from 'lucide-react';
import { skillOptions } from '@/services/studentService';
import { toast } from 'sonner';
import type { Project } from '@/types/student';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSave?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export function EditProjectDialog({ 
  open, 
  onOpenChange, 
  project, 
  onSave, 
  onDelete 
}: EditProjectDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technologies: [] as string[],
    startDate: '',
    endDate: '',
    projectUrl: '',
    githubUrl: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description,
        technologies: project.technologies,
        startDate: project.start_date,
        endDate: project.end_date || '',
        projectUrl: project.project_url || '',
        githubUrl: project.github_url || '',
      });
    }
  }, [project]);

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

  const handleSave = () => {
    if (!project) return;
    
    const updatedProject: Project = {
      ...project,
      title: formData.title,
      description: formData.description,
      technologies: formData.technologies,
      start_date: formData.startDate,
      end_date: formData.endDate || undefined,
      project_url: formData.projectUrl || undefined,
      github_url: formData.githubUrl || undefined,
    };
    
    onSave?.(updatedProject);
    toast.success('Project updated successfully!');
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!project) return;
    onDelete?.(project.id);
    toast.success('Project deleted successfully!');
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const canSave = formData.title.trim() && formData.description.trim() && formData.technologies.length > 0;

  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Edit Project
          </DialogTitle>
          <DialogDescription>
            Update your project details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Technologies Used *</Label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-border rounded-lg bg-accent/30">
              {formData.technologies.length === 0 ? (
                <span className="text-sm text-muted-foreground">Select technologies below</span>
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
                Start Date
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
              />
            </div>
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
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteConfirm(true)}
            className="sm:mr-auto"
          >
            Delete Project
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
