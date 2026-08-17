import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle,
  Code,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Github,
  Link as LinkIcon,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PortfolioProjectDialog } from '@/components/portfolio/PortfolioProjectDialog';
import { PortfolioShowcaseDialog } from '@/components/portfolio/PortfolioShowcaseDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyInternships } from '@/hooks/use-internship-api';
import {
  useAddPortfolioProject,
  useAddShowcase,
  useDeletePortfolioProject,
  useDeleteShowcase,
  useMyPortfolio,
  useUpdatePortfolioProject,
} from '@/hooks/use-portfolio-api';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/formatters';
import {
  getPortfolioCompletionPercent,
  getPortfolioErrorMessage,
  getPortfolioStatusMeta,
} from '@/lib/portfolioModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type {
  ApiPortfolioProject,
  CreatePortfolioProjectInput,
  CreateShowcaseInput,
  UpdatePortfolioProjectInput,
} from '@/types/portfolio';

type DeleteTarget =
  | { type: 'project'; id: string; label: string }
  | { type: 'showcase'; id: string; label: string }
  | null;

export default function Portfolio() {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [showcaseDialogOpen, setShowcaseDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiPortfolioProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const portfolioQuery = useMyPortfolio();
  const internshipsQuery = useMyInternships();
  const addProject = useAddPortfolioProject();
  const updateProject = useUpdatePortfolioProject();
  const deleteProject = useDeletePortfolioProject();
  const addShowcase = useAddShowcase();
  const deleteShowcase = useDeleteShowcase();

  const portfolio = portfolioQuery.data;
  const statusMeta = portfolio ? getPortfolioStatusMeta(portfolio.status) : null;
  const completionPercent = useMemo(
    () => (portfolio ? getPortfolioCompletionPercent(portfolio) : 0),
    [portfolio]
  );

  if (portfolioQuery.isLoading) {
    return (
      <DashboardLayout title="My Portfolio" subtitle="Showcase your projects and internship experience">
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (portfolioQuery.error || !portfolio) {
    return (
      <DashboardLayout title="My Portfolio" subtitle="Showcase your projects and internship experience">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load your portfolio</AlertTitle>
          <AlertDescription>
            {getPortfolioErrorMessage(portfolioQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const projects = portfolio.projects;
  const showcases = portfolio.showcases;
  const internships = internshipsQuery.data ?? [];
  const isPublished = portfolio.status === 'published';

  function openCreateProjectDialog() {
    setEditingProject(null);
    setProjectDialogOpen(true);
  }

  function openEditProjectDialog(project: ApiPortfolioProject) {
    setEditingProject(project);
    setProjectDialogOpen(true);
  }

  async function handleProjectSubmit(data: CreatePortfolioProjectInput | UpdatePortfolioProjectInput) {
    try {
      if (editingProject) {
        await updateProject.mutateAsync({
          projectId: editingProject.id,
          data,
        });
        toast.success('Portfolio project updated.');
      } else {
        await addProject.mutateAsync(data as CreatePortfolioProjectInput);
        toast.success('Portfolio project added.');
      }

      setProjectDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      toast.error(getPortfolioErrorMessage(error, 'Unable to save this project right now.'));
    }
  }

  async function handleShowcaseSubmit(data: CreateShowcaseInput) {
    try {
      await addShowcase.mutateAsync(data);
      toast.success('Internship showcase added.');
      setShowcaseDialogOpen(false);
    } catch (error) {
      toast.error(getPortfolioErrorMessage(error, 'Unable to add the internship showcase.'));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'project') {
        await deleteProject.mutateAsync(deleteTarget.id);
        toast.success('Portfolio project deleted.');
      } else {
        await deleteShowcase.mutateAsync(deleteTarget.id);
        toast.success('Internship showcase deleted.');
      }

      setDeleteTarget(null);
    } catch (error) {
      toast.error(getPortfolioErrorMessage(error, 'Unable to delete this item right now.'));
    }
  }

  const isDeleting = deleteProject.isPending || deleteShowcase.isPending;

  return (
    <DashboardLayout
      title="My Portfolio"
      subtitle="Showcase your projects, internship experience, and outcomes to recruiters"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={statusMeta?.variant}>
              {isPublished ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
              {statusMeta?.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {projects.length} Projects • {showcases.length} Internships
            </span>
            <span className="text-xs text-muted-foreground">
              Updated {formatRelativeTime(portfolio.updated_at)}
            </span>
          </div>
        </div>

        {completionPercent < 100 ? (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Portfolio completion: {completionPercent}%</AlertTitle>
            <AlertDescription>
              Add more projects, outcomes, and keywords to make your recruiter-facing portfolio stronger.
            </AlertDescription>
          </Alert>
        ) : null}

        {internshipsQuery.error ? (
          <Alert>
            <Briefcase className="h-4 w-4" />
            <AlertTitle>Internship linking is temporarily unavailable</AlertTitle>
            <AlertDescription>
              Your portfolio still works, but the internship picker could not be loaded right now. You can continue with a manual showcase entry.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Summary</CardTitle>
            <CardDescription>Live summary of the content currently in your portfolio.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{portfolio.project_count}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{portfolio.internship_count}</p>
                <p className="text-xs text-muted-foreground">Internships</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {projects.reduce((count, project) => count + project.technologies.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Technology Tags</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{completionPercent}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">
              Last updated on {formatDateTime(portfolio.updated_at)}.
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {projects.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="showcases" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Internships
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {showcases.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Portfolio Projects</h3>
              <Button onClick={openCreateProjectDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </div>

            {projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6">
                  <EmptyState
                    icon={FolderKanban}
                    title="No portfolio projects yet"
                    description="Add the strongest projects you want recruiters to notice first."
                    actionLabel="Add Project"
                    onAction={openCreateProjectDialog}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-semibold">{project.title}</h4>
                              {project.is_ongoing ? (
                                <Badge variant="outline">Ongoing</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {project.role || 'Role not specified'}
                              {project.start_date ? ` • ${formatDate(project.start_date)}` : ''}
                              {project.end_date ? ` to ${formatDate(project.end_date)}` : project.is_ongoing ? ' to Present' : ''}
                            </p>
                          </div>

                          {project.description ? (
                            <p className="text-sm text-foreground">{project.description}</p>
                          ) : null}

                          {project.technologies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {project.technologies.map((technology) => (
                                <Badge key={technology} variant="secondary" className="text-xs">
                                  <Code className="mr-1 h-3 w-3" />
                                  {technology}
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          {project.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {project.keywords.map((keyword) => (
                                <Badge key={keyword} variant="outline" className="text-xs">
                                  <Tag className="mr-1 h-3 w-3" />
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-3">
                            {project.github_url ? (
                              <a
                                href={project.github_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Github className="h-4 w-4" />
                                GitHub
                              </a>
                            ) : null}
                            {project.live_url ? (
                              <a
                                href={project.live_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Live Demo
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditProjectDialog(project)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ type: 'project', id: project.id, label: project.title })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="showcases" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Internship Showcases</h3>
                <p className="text-sm text-muted-foreground">
                  Linked internship records available: {internships.length}
                </p>
              </div>
              <Button onClick={() => setShowcaseDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Showcase
              </Button>
            </div>

            {showcases.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6">
                  <EmptyState
                    icon={Briefcase}
                    title="No internship showcases yet"
                    description="Add the internships and outcomes you want recruiters to see."
                    actionLabel="Add Showcase"
                    onAction={() => setShowcaseDialogOpen(true)}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {showcases.map((showcase) => (
                  <Card key={showcase.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-semibold">{showcase.role}</h4>
                              {showcase.is_verified ? (
                                <Badge variant="success">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline">Unverified</Badge>
                              )}
                              {showcase.linked_internship_id ? (
                                <Badge variant="secondary">
                                  <LinkIcon className="mr-1 h-3 w-3" />
                                  Linked Record
                                </Badge>
                              ) : null}
                            </div>
                            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4" />
                              {showcase.company_name}
                              {showcase.duration_months != null ? ` • ${showcase.duration_months} month${showcase.duration_months === 1 ? '' : 's'}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {showcase.start_date ? formatDate(showcase.start_date) : 'Start date not set'}
                              {showcase.end_date ? ` to ${formatDate(showcase.end_date)}` : ''}
                            </p>
                          </div>

                          {showcase.key_outcomes.length > 0 ? (
                            <ul className="space-y-2">
                              {showcase.key_outcomes.map((outcome, index) => (
                                <li key={`${showcase.id}-${index}`} className="text-sm text-foreground">
                                  {outcome}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {showcase.proof_url ? (
                            <a
                              href={resolveBackendAssetUrl(showcase.proof_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              View Completion Certificate
                            </a>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ type: 'showcase', id: showcase.id, label: `${showcase.company_name} • ${showcase.role}` })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      <PortfolioProjectDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) {
            setEditingProject(null);
          }
        }}
        project={editingProject}
        isPending={addProject.isPending || updateProject.isPending}
        onSubmit={handleProjectSubmit}
      />

      <PortfolioShowcaseDialog
        open={showcaseDialogOpen}
        onOpenChange={setShowcaseDialogOpen}
        internships={internships}
        isPending={addShowcase.isPending}
        onSubmit={handleShowcaseSubmit}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'project' ? 'project' : 'showcase'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{deleteTarget?.label}</span> from your portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
