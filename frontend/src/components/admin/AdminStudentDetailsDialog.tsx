import type { ReactNode } from 'react';
import { ExternalLink, Loader2, UserRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminStudentDetail } from '@/hooks/use-admin-api';
import { formatCGPA, formatLPA } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiAdminStudent } from '@/types/admin';
import { StudentProfileBlockSection } from '@/components/admin/StudentProfileBlockSection';

interface AdminStudentDetailsDialogProps {
  studentId: string | null;
  student?: ApiAdminStudent | null;
  defaultSection?: 'portfolio';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN');
}

// Mirrors StudentEmploymentTab's labels (Full-time / Part-time only).
function employmentTypeLabel(value: string | null | undefined): string {
  if (value === 'full_time_job') return 'Full-Time Job';
  if (value === 'part-time') return 'Part-Time';
  return value || 'Not specified';
}

function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  isOngoing = false,
) {
  if (!startDate && !endDate) return 'Dates not specified';
  if (startDate && (endDate || isOngoing)) {
    return `${formatDate(startDate)} to ${isOngoing ? 'Present' : formatDate(endDate)}`;
  }
  if (startDate) return `Started ${formatDate(startDate)}`;
  return `Until ${formatDate(endDate)}`;
}

function detailValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function DetailItem({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{detailValue(value)}</p>
    </div>
  );
}

function DocumentLink({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return null;
  return (
    <a
      href={resolveBackendAssetUrl(href)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}

function ExpandableCard({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border p-4" open={defaultOpen}>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        {title}{typeof count === 'number' ? ` (${count})` : ''}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">No {label} recorded.</p>;
}

function PortfolioAndNoDuesContent({ student }: { student: ApiAdminStudent }) {
  const portfolio = student.portfolio;
  const portfolioProjects = portfolio?.projects ?? [];
  const portfolioShowcases = portfolio?.showcases ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Portfolio Status</p>
          <p className="text-sm font-medium">{detailValue(portfolio?.status)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Portfolio Projects</p>
          <p className="text-sm font-medium">{portfolioProjects.length}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Portfolio Showcases</p>
          <p className="text-sm font-medium">{portfolioShowcases.length}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Internship Records</p>
          <p className="text-sm font-medium">{student.internships.length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border p-4">
          <p className="mb-3 text-sm font-medium">Portfolio Projects</p>
          {portfolioProjects.length === 0 ? (
            <EmptyDetail label="portfolio projects" />
          ) : (
            <div className="space-y-3">
              {portfolioProjects.map((project) => (
                <div key={project.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{project.title}</p>
                    {project.is_ongoing ? <Badge variant="outline">Ongoing</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.role || 'Role not specified'} • {formatDateRange(project.start_date, project.end_date, project.is_ongoing)}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{project.description || 'No description added.'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Technologies: {project.technologies.join(', ') || 'No technologies listed'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keywords: {project.keywords.join(', ') || 'No keywords listed'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <DocumentLink href={project.github_url} label="GitHub" />
                    <DocumentLink href={project.live_url} label="Live URL" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border p-4">
          <p className="mb-3 text-sm font-medium">Portfolio Showcases</p>
          {portfolioShowcases.length === 0 ? (
            <EmptyDetail label="portfolio showcases" />
          ) : (
            <div className="space-y-3">
              {portfolioShowcases.map((showcase) => (
                <div key={showcase.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{showcase.role}</p>
                    {showcase.is_verified ? <Badge variant="success">Verified</Badge> : null}
                    {showcase.linked_internship_id ? <Badge variant="secondary">Linked Record</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{showcase.company_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {showcase.duration_months ? `${showcase.duration_months} month(s)` : 'Duration not specified'} • {formatDateRange(showcase.start_date, showcase.end_date)}
                  </p>
                  {showcase.key_outcomes.length > 0 ? (
                    <div className="mt-2 space-y-1 text-sm text-foreground">
                      {showcase.key_outcomes.map((outcome, index) => (
                        <p key={`${showcase.id}-${index}`}>{outcome}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No outcomes added.</p>
                  )}
                  <div className="mt-2">
                    <DocumentLink href={showcase.proof_url} label="Completion certificate" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">Student Internship Records</p>
        {student.internships.length > 0 ? (
          <div className="space-y-3">
            {student.internships.map((internship) => (
              <div key={internship.id} className="rounded-md border p-3">
                <p className="font-medium">{internship.company_name} • {internship.role}</p>
                <p className="text-sm text-muted-foreground">
                  {internship.internship_type} • {internship.status} • {formatDateRange(internship.start_date, internship.end_date)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stipend: {internship.stipend_amount ? `₹${internship.stipend_amount.toLocaleString('en-IN')}` : '—'} • Issues: {internship.open_issue_count}/{internship.issue_count} open
                </p>
                <div className="mt-2">
                  <DocumentLink href={internship.certificate_url} label="Offer letter / certificate" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyDetail label="internship records" />
        )}
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">No Dues Requests</p>
        {student.no_dues_requests.length > 0 ? (
          <div className="space-y-2">
            {student.no_dues_requests.map((request) => (
              <div key={request.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{request.exit_reason} • {request.status}</p>
                <p className="text-muted-foreground">{request.company_name || request.designation || request.ndc_number || 'No extra summary'}</p>
                <DocumentLink href={request.proof_url} label="Proof attachment" />
                <DocumentLink href={request.certificate_url} label="NDC certificate" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyDetail label="no dues requests" />
        )}
      </div>
    </div>
  );
}

function StudentDetailsContent({
  student,
  defaultSection,
}: {
  student: ApiAdminStudent;
  defaultSection?: 'portfolio';
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{student.verificationStatus}</Badge>
        <Badge variant={student.policy_accepted ? 'success' : 'destructive'}>
          {student.policy_accepted ? 'Policy Accepted' : 'Policy Pending'}
        </Badge>
        <Badge variant={student.no_dues_enabled ? 'success' : 'secondary'}>
          {student.no_dues_enabled ? 'No Dues Enabled' : 'No Dues Disabled'}
        </Badge>
        {student.profile_blocked ? (
          <Badge variant="destructive">Profile Blocked</Badge>
        ) : (
          <Badge variant="outline">Profile Active</Badge>
        )}
      </div>

      <StudentProfileBlockSection
        studentId={student.student_id}
        studentName={student.full_name}
        profileBlocked={student.profile_blocked}
        profileBlockReason={student.profile_block_reason}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Full Name" value={student.full_name} />
        <DetailItem label="Enrollment" value={student.enrollment_number} />
        <DetailItem label="Roll Number" value={student.roll_number} />
        <DetailItem label="Email" value={student.email} />
        <DetailItem label="Mobile" value={student.mobile} />
        <DetailItem label="Department / Branch" value={student.department} />
        <DetailItem label="Course" value={student.course_name} />
        <DetailItem label="Batch" value={student.batch_year} />
        <DetailItem label="CGPA" value={formatCGPA(student.academicProfile.cgpa)} />
      </div>

      <div className="space-y-3">
        <ExpandableCard title="Personal and CRM Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Institute" value={student.institute_name} />
            <DetailItem label="Program" value={student.program_name} />
            <DetailItem label="Current Semester" value={student.current_semester} />
            <DetailItem label="Admission Year" value={student.admission_year} />
            <DetailItem label="Category" value={student.category} />
            <DetailItem label="Aadhaar" value={student.aadhaar_number} />
            <DetailItem label="Parent Name" value={student.parent_name} />
            <DetailItem label="Parent Contact" value={student.parent_contact_no} />
            <DetailItem label="Blood Group" value={student.blood_group} />
            <DetailItem label="Attendance %" value={student.overall_attendance_percentage} />
            <DetailItem label="Date of Birth" value={formatDate(student.date_of_birth)} />
            <DetailItem label="LinkedIn" value={student.linkedin_url} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Current Address" value={student.current_address} />
            <DetailItem label="Permanent Address" value={student.permanent_address} />
          </div>
        </ExpandableCard>

        <ExpandableCard title="Academic Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="CGPA" value={formatCGPA(student.academicProfile.cgpa)} />
            <DetailItem label="10th %" value={student.academicProfile.tenth_percentage} />
            <DetailItem label="12th %" value={student.academicProfile.twelfth_percentage} />
            <DetailItem label="Diploma %" value={student.academicProfile.diploma_percentage} />
            <DetailItem label="Backlogs" value={student.academicProfile.backlog_count} />
            <DetailItem label="Semester" value={student.academicProfile.semester} />
            <DetailItem label="Year" value={student.academicProfile.year} />
          </div>
        </ExpandableCard>

        <ExpandableCard title="Skills">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Technical Skills" value={student.skills?.technical_skills.join(', ')} />
            <DetailItem label="Domain Interests" value={student.skills?.domain_interests.join(', ')} />
            <DetailItem label="Preferred Locations" value={student.skills?.preferred_locations.join(', ')} />
          </div>
        </ExpandableCard>

        <ExpandableCard title="Employment">
          {student.employments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employment records.</p>
          ) : (
            <div className="space-y-3">
              {student.employments.map((employment) => {
                const closed = employment.status === 'closed';
                return (
                  <div key={employment.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{employment.company_name || 'Company'}</p>
                      <Badge variant={closed ? 'secondary' : 'success'}>{closed ? 'Closed' : 'Active'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {employment.designation || 'Role'} · {employmentTypeLabel(employment.employment_type)}
                      {employment.package_lpa != null ? ` · ${formatLPA(employment.package_lpa)}` : ''}
                    </p>
                    {closed && employment.closed_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">Closed on {formatDate(employment.closed_at)}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <DocumentLink href={employment.offer_letter_url} label="Offer letter" />
                      {closed ? (
                        <DocumentLink
                          href={employment.completion_proof_url}
                          label={employment.completion_proof_name || 'Completion proof'}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ExpandableCard>

        <ExpandableCard title="Projects" count={student.projects.length}>
          {student.projects.length === 0 ? <EmptyDetail label="projects" /> : (
            <div className="space-y-3">
              {student.projects.map((project) => (
                <div key={project.id} className="rounded-md border p-3">
                  <p className="font-medium">{project.title}</p>
                  <p className="text-sm text-muted-foreground">{project.description || 'No description'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.technologies.join(', ') || 'No technologies'}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <DocumentLink href={project.github_url} label="GitHub" />
                    <DocumentLink href={project.demo_url} label="Demo" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ExpandableCard>

        <ExpandableCard title="Certifications" count={student.certifications.length}>
          {student.certifications.length === 0 ? <EmptyDetail label="certifications" /> : (
            <div className="space-y-3">
              {student.certifications.map((certification) => (
                <div key={certification.id} className="rounded-md border p-3">
                  <p className="font-medium">{certification.name}</p>
                  <p className="text-sm text-muted-foreground">{certification.issuer} • {formatDate(certification.issue_date)}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <DocumentLink href={certification.credential_url} label="Credential URL" />
                    <DocumentLink href={certification.document_url} label={certification.document_name || 'Supporting document'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ExpandableCard>

        <ExpandableCard title="Internships" count={student.internships.length}>
          {student.internships.length === 0 ? <EmptyDetail label="internships" /> : (
            <div className="space-y-3">
              {student.internships.map((internship) => (
                <div key={internship.id} className="rounded-md border p-3">
                  <p className="font-medium">{internship.company_name} • {internship.role}</p>
                  <p className="text-sm text-muted-foreground">
                    {internship.internship_type} • {internship.status} • {formatDate(internship.start_date)} to {formatDate(internship.end_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stipend: {internship.stipend_amount ? `Rs ${internship.stipend_amount.toLocaleString('en-IN')}` : '—'} • Issues: {internship.open_issue_count}/{internship.issue_count} open
                  </p>
                  <div className="mt-2">
                    <DocumentLink href={internship.certificate_url} label="Offer letter / certificate" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ExpandableCard>

        <ExpandableCard title="Applications and Offers" count={student.applications.length + student.offers.length}>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Applications</p>
              {student.applications.length === 0 ? <EmptyDetail label="applications" /> : (
                <div className="space-y-2">
                  {student.applications.map((application) => (
                    <div key={application.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{application.posting.company_name} • {application.posting.role_name}</p>
                      <p className="text-muted-foreground">{application.current_stage} • Applied {formatDate(application.applied_at)}</p>
                      <DocumentLink href={application.resume?.file_url} label={application.resume?.name || 'Resume'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Offers / Jobs</p>
              {student.offers.length === 0 ? <EmptyDetail label="offers" /> : (
                <div className="space-y-2">
                  {student.offers.map((offer) => (
                    <div key={offer.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{offer.company_name} • {offer.role}</p>
                      <p className="text-muted-foreground">
                        {offer.type} • {offer.status} • {offer.ctc || offer.stipend || 'Compensation not set'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ExpandableCard>

        <ExpandableCard title="NOC and Policy" count={student.noc_requests.length + student.policy_acceptances.length}>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">NOC Requests</p>
              {student.noc_requests.length === 0 ? <EmptyDetail label="NOC requests" /> : (
                <div className="space-y-2">
                  {student.noc_requests.map((noc) => (
                    <div key={noc.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{noc.company_name} • {noc.role_title}</p>
                      <p className="text-muted-foreground">{noc.program} • {noc.status} • {formatDate(noc.created_at)}</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <DocumentLink href={noc.offer_letter_url} label="Offer letter" />
                        <DocumentLink href={noc.certificate_url} label="NOC certificate" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Policy Acceptances</p>
              {student.policy_acceptances.length === 0 ? <EmptyDetail label="policy acceptances" /> : (
                <div className="space-y-2">
                  {student.policy_acceptances.map((acceptance) => (
                    <div key={acceptance.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{acceptance.policy_title || 'Policy'}</p>
                      <p className="text-muted-foreground">v{acceptance.policy_version || '—'} • Accepted {formatDate(acceptance.accepted_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ExpandableCard>

        <ExpandableCard
          title="Portfolio and No Dues"
          count={student.no_dues_requests.length}
          defaultOpen={defaultSection === 'portfolio'}
        >
          <PortfolioAndNoDuesContent student={student} />
        </ExpandableCard>
      </div>
    </div>
  );
}

export function AdminStudentDetailsDialog({
  studentId,
  student,
  defaultSection,
  open,
  onOpenChange,
}: AdminStudentDetailsDialogProps) {
  const studentQuery = useAdminStudentDetail(open && studentId && !student ? studentId : '');
  const resolvedStudent = student ?? studentQuery.data ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            Student Full Details
          </DialogTitle>
          <DialogDescription>
            Complete student profile, academics, projects, internships, placements, NOC, and No Dues history.
          </DialogDescription>
        </DialogHeader>

        {studentQuery.isLoading && !resolvedStudent ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading student details...
          </div>
        ) : studentQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load student details</AlertTitle>
            <AlertDescription>
              {studentQuery.error instanceof Error ? studentQuery.error.message : 'Please close and try again.'}
            </AlertDescription>
          </Alert>
        ) : resolvedStudent ? (
          <StudentDetailsContent student={resolvedStudent} defaultSection={defaultSection} />
        ) : (
          <p className="py-8 text-sm text-muted-foreground">Select a student to view details.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
