import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  User,
  MapPin,
  GraduationCap,
  Briefcase,
  FileText,
  Award,
  Code,
  ExternalLink,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Download,
  Linkedin,
  Github,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Application } from '@/types/application';
import { APPLICATION_STAGE_CONFIG } from '@/types/application';
import { PortfolioReadOnlyView } from '@/components/portfolio/PortfolioReadOnlyView';

// Extended candidate data with full profile (in real app, this would be fetched)
interface CandidateProfile {
  // Personal
  full_name: string;
  email: string;
  mobile: string;
  linkedin_url?: string;
  date_of_birth: string;
  permanent_address: string;
  
  // Academic
  cgpa: number;
  tenth_percentage: number;
  twelfth_percentage?: number;
  diploma_percentage?: number;
  backlog_count: number;
  semester: number;
  year: number;
  
  // Skills & Interests
  skills: string[];
  domain_interests: string[];
  preferred_locations: string[];
  
  // Projects
  projects: {
    id: string;
    title: string;
    description: string;
    technologies: string[];
    github_url?: string;
  }[];
  
  // Certifications
  certifications: {
    id: string;
    name: string;
    issuer: string;
    issue_date: string;
    credential_url?: string;
  }[];
}

interface CandidateDetailSheetProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSubmit: (applicationId: string, feedback: 'shortlisted' | 'rejected' | 'under_consideration', remarks: string) => void;
}

// Mock extended profile data - in real app, fetch based on student_id
const getMockCandidateProfile = (application: Application): CandidateProfile => ({
  full_name: application.student_name,
  email: application.email,
  mobile: '+91 98765 43210',
  linkedin_url: 'https://linkedin.com/in/candidate',
  date_of_birth: '2002-05-15',
  permanent_address: '123, Green Valley, Ahmedabad, Gujarat - 380015',
  cgpa: application.cgpa,
  tenth_percentage: application.tenth_percentage,
  twelfth_percentage: application.twelfth_percentage,
  diploma_percentage: undefined,
  backlog_count: 0,
  semester: 7,
  year: 4,
  skills: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Git'],
  domain_interests: ['Full Stack Development', 'Cloud Computing', 'Machine Learning'],
  preferred_locations: ['Bangalore', 'Hyderabad', 'Pune', 'Remote'],
  projects: [
    {
      id: 'proj1',
      title: 'E-Commerce Platform',
      description: 'Built a full-stack e-commerce platform with React, Node.js, and PostgreSQL. Implemented user auth, product catalog, cart, and Stripe payments.',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
      github_url: 'https://github.com/user/ecommerce',
    },
    {
      id: 'proj2',
      title: 'ML-Based Resume Parser',
      description: 'Developed an ML model to parse and extract structured data from resumes using NLP. Achieved 94% accuracy.',
      technologies: ['Python', 'TensorFlow', 'spaCy', 'FastAPI'],
      github_url: 'https://github.com/user/resume-parser',
    },
  ],
  certifications: [
    {
      id: 'cert1',
      name: 'AWS Cloud Practitioner',
      issuer: 'Amazon Web Services',
      issue_date: '2024-03-15',
      credential_url: 'https://aws.amazon.com/verify',
    },
    {
      id: 'cert2',
      name: 'Google Data Analytics',
      issuer: 'Google',
      issue_date: '2024-06-20',
    },
  ],
});

export function CandidateDetailSheet({ 
  application, 
  isOpen, 
  onClose, 
  onFeedbackSubmit 
}: CandidateDetailSheetProps) {
  const [feedbackType, setFeedbackType] = useState<'shortlisted' | 'rejected' | 'under_consideration'>('shortlisted');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!application) return null;

  const profile = getMockCandidateProfile(application);
  const stageConfig = APPLICATION_STAGE_CONFIG[application.current_stage];
  const initials = application.student_name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    onFeedbackSubmit(application.id, feedbackType, remarks);
    setIsSubmitting(false);
    setRemarks('');
    onClose();
  };

  const handleDownloadResume = () => {
    toast.success(`Downloading ${application.resume_name}...`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header with Avatar and Quick Info */}
        <div className="p-6 bg-muted/30 border-b">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-md">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl">{application.student_name}</SheetTitle>
                <Badge variant="outline" className={stageConfig.color}>
                  {stageConfig.label}
                </Badge>
              </div>
              <SheetDescription className="mt-1">
                {application.enrollment_number} • {application.department}
              </SheetDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  Batch {application.batch}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Applied {format(new Date(application.applied_at), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick Academic Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-primary">{profile.cgpa}</p>
              <p className="text-xs text-muted-foreground">CGPA</p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{profile.tenth_percentage}%</p>
              <p className="text-xs text-muted-foreground">10th</p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{profile.twelfth_percentage || 'N/A'}%</p>
              <p className="text-xs text-muted-foreground">12th</p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{profile.backlog_count}</p>
              <p className="text-xs text-muted-foreground">Backlogs</p>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="skills">Skills & Projects</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="resume">Resume</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6">
            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-4 space-y-6 pb-6">
              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Personal contact details (email, phone, address) are restricted per university policy. Please coordinate through the TPO office.</span>
                  </div>
                  {profile.linkedin_url && (
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={profile.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View LinkedIn Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Academic Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Academic Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{application.department}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Batch</p>
                      <p className="font-medium">{application.batch}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Semester</p>
                      <p className="font-medium">Semester {profile.semester}, Year {profile.year}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Backlog History</p>
                      <p className="font-medium">{profile.backlog_count === 0 ? 'None' : `${profile.backlog_count} backlogs`}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              {profile.certifications.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{cert.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cert.issuer} • Issued {format(new Date(cert.issue_date), 'MMM yyyy')}
                          </p>
                        </div>
                        {cert.credential_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={cert.credential_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="mt-4 space-y-6 pb-6">
              {/* Technical Skills */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Technical Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Domain Interests */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Domain Interests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.domain_interests.map((domain) => (
                      <Badge key={domain} variant="outline">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Preferred Locations */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Preferred Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_locations.map((location) => (
                      <Badge key={location} variant="outline">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Projects */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Projects ({profile.projects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.projects.map((project) => (
                    <div key={project.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{project.title}</h4>
                        {project.github_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio" className="mt-4 space-y-6 pb-6">
              <PortfolioReadOnlyView studentId={application.student_id || 'STU2024001'} />
            </TabsContent>

            {/* Resume Tab */}
            <TabsContent value="resume" className="mt-4 space-y-6 pb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Submitted Resume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{application.resume_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted with application on {format(new Date(application.applied_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleDownloadResume}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  {/* Resume Preview Placeholder */}
                  <div className="mt-4 border rounded-lg aspect-[8.5/11] bg-muted/20 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Resume preview</p>
                      <p className="text-xs">Click download to view full document</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer with Feedback Actions */}
        <div className="border-t p-6 space-y-4 bg-background">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Decision</Label>
              <Select 
                value={feedbackType} 
                onValueChange={(v) => setFeedbackType(v as typeof feedbackType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shortlisted">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      Shortlist
                    </div>
                  </SelectItem>
                  <SelectItem value="under_consideration">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-600" />
                      Under Consideration
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      Not Selected
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                placeholder="Add comments..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={1}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
