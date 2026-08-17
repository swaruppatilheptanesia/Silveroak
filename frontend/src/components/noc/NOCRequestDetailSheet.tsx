import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  MapPin,
  IndianRupee,
  Phone,
  Mail,
  User,
  Briefcase,
  Download,
  FileText,
  Clock,
  GraduationCap,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import type { ApiNocDetail, ApiNocMyItem, NOCRequest } from '@/types/noc';
import { 
  NOC_STATUS_CONFIG, 
  NOC_TYPE_LABELS, 
  PLACEMENT_SOURCE_LABELS,
  COMPANY_REFERENCE_LABELS
} from '@/types/noc';
import { NOCStatusTimeline } from './NOCStatusTimeline';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import {
  COMPLETION_STATUS_CONFIG,
  getNocCompanyLocation,
  getNocFacultyApproverName,
  getNocProgramLabel,
  getNocReferenceBy,
  getNocReferenceDetails,
  getNocStipendAmount,
  getNocTpoApproverName,
} from '@/lib/nocModule';
import { resolveNocCertificatePreview } from '@/lib/nocTemplateModule';
import { NocTemplatePreview } from './NocTemplatePreview';

type NocSheetRecord = NOCRequest | ApiNocMyItem | ApiNocDetail;

interface NOCRequestDetailSheetProps {
  request: NocSheetRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NOCRequestDetailSheet({ request, isOpen, onClose }: NOCRequestDetailSheetProps) {
  if (!request) return null;
  
  const statusConfig = NOC_STATUS_CONFIG[request.status];
  const certificateUrl = request.certificate_url ? resolveBackendAssetUrl(request.certificate_url) : null;
  const certificateViewHref = certificateUrl ?? (request.certificate_snapshot ? `/noc/certificate/${request.id}` : null);
  const certificateDownloadHref = certificateUrl ?? (request.certificate_snapshot ? `/noc/certificate/${request.id}?download=1` : null);
  const certificatePreview = request.certificate_snapshot
    ? resolveNocCertificatePreview(request)
    : null;
  const driveName = 'drive_name' in request ? request.drive_name : undefined;
  const referenceBy = getNocReferenceBy(request);
  const referenceDetails = getNocReferenceDetails(request);
  const stipendAmount = getNocStipendAmount(request);
  const facultyApproverName = getNocFacultyApproverName(request);
  const tpoApproverName = getNocTpoApproverName(request);
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-muted/30">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg">{request.role_title}</SheetTitle>
              <SheetDescription className="mt-1">
                {request.company_name}
              </SheetDescription>
            </div>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{NOC_TYPE_LABELS[request.noc_type]}</Badge>
            <Badge variant="outline">{getNocProgramLabel(request.program)}</Badge>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Status Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-3">Approval Status</h4>
              <NOCStatusTimeline
                currentStatus={request.status}
                facultyApprovedAt={request.faculty_approved_at}
                facultyApproverName={facultyApproverName}
                tpoApprovedAt={request.tpo_approved_at}
                tpoApproverName={tpoApproverName}
                issuedAt={request.issued_at}
                rejectedAt={request.rejected_at}
                rejectionReason={request.rejection_reason}
              />
            </div>
            
            <Separator />
            
            {/* NOC Details if issued */}
            {request.noc_number && (
              <>
                <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">NOC Number</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{request.noc_number}</p>
                {request.issued_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Issued on {format(new Date(request.issued_at), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      {certificateViewHref && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" asChild>
                            {certificateUrl ? (
                              <a href={certificateViewHref} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View
                              </a>
                            ) : (
                              <Link to={certificateViewHref}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            )}
                          </Button>
                          <Button asChild>
                            {certificateUrl ? (
                              <a href={certificateDownloadHref} download={`${request.noc_number || 'noc-certificate'}.pdf`}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            ) : (
                              <Link to={certificateDownloadHref}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Link>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Separator />
              </>
            )}

            {certificatePreview && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Issued Certificate
                  </h4>
                  <NocTemplatePreview
                    subject={certificatePreview.subject}
                    bodyHtml={certificatePreview.bodyHtml}
                    values={certificatePreview.values}
                    className="max-w-none"
                  />
                </div>
                <Separator />
              </>
            )}
            {!certificatePreview && certificateUrl && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Certificate Preview
                  </h4>
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <iframe
                      title={`NOC Certificate ${request.noc_number || ''}`}
                      src={certificateUrl}
                      className="h-[70vh] w-full bg-white"
                    />
                  </div>
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open certificate in a new tab
                  </a>
                </div>
                <Separator />
              </>
            )}
            
            {/* Company Details */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">Company:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{request.company_name}</span>
                    {request.company_verification_status === 'verified' && (
                      <Badge variant="outline" className="text-emerald-600 text-xs">Verified</Badge>
                    )}
                    {request.company_verification_status === 'pending' && (
                      <Badge variant="outline" className="text-amber-600 text-xs">Pending Verification</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">Address:</span>
                  <span>
                    {[
                      request.company_address,
                      getNocCompanyLocation(request),
                      request.company_pincode ? `- ${request.company_pincode}` : null,
                    ]
                      .filter(Boolean)
                      .join(' ') || 'Not provided'}
                  </span>
                </div>
                {(request.company_pan || request.company_gst) && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">PAN / GST:</span>
                    <span>{[request.company_pan, request.company_gst].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
                {referenceBy && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">Reference:</span>
                    <span>{COMPANY_REFERENCE_LABELS[referenceBy] || referenceBy}</span>
                  </div>
                )}
                {referenceDetails && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">Notes:</span>
                    <span>{referenceDetails}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Contact Person */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Company Contact Person
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{request.contact_person_name || 'Not provided'}</span>
                  {request.contact_person_designation && (
                    <span className="text-muted-foreground">({request.contact_person_designation})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{request.contact_person_phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{request.contact_person_email || 'Not provided'}</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Internship/Training Details */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {NOC_TYPE_LABELS[request.noc_type]} Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">Position:</span>
                  <span className="font-medium">{request.role_title}</span>
                </div>
                {request.internship_type && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">Type:</span>
                    <span className="font-medium capitalize">{request.internship_type}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">Technology:</span>
                  <span>{request.technology_domain || 'Not provided'}</span>
                </div>
                {request.job_description && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">Description:</span>
                    <span>{request.job_description}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(request.start_date), 'dd MMM yyyy')} - {request.end_date ? format(new Date(request.end_date), 'dd MMM yyyy') : 'Ongoing'}
                  </span>
                  {request.duration_weeks && <Badge variant="secondary">{request.duration_weeks} weeks</Badge>}
                </div>
                {stipendAmount !== null && (
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>₹{stipendAmount.toLocaleString('en-IN')}/month</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Source */}
            <div>
              <h4 className="text-sm font-medium mb-3">Placement Source</h4>
              <Badge variant="outline">{PLACEMENT_SOURCE_LABELS[request.placement_source]}</Badge>
              {driveName && (
                <p className="text-sm text-muted-foreground mt-1">{driveName}</p>
              )}
            </div>
            
            {/* Approval Remarks */}
            {(request.faculty_remarks || request.tpo_remarks) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Approval Remarks</h4>
                  <div className="space-y-3">
                    {request.faculty_remarks && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          Faculty Coordinator{facultyApproverName ? ` - ${facultyApproverName}` : ''}
                        </p>
                        <p className="text-sm mt-1">{request.faculty_remarks}</p>
                      </div>
                    )}
                    {request.tpo_remarks && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          TPO Admin{tpoApproverName ? ` - ${tpoApproverName}` : ''}
                        </p>
                        <p className="text-sm mt-1">{request.tpo_remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* Documents */}
            {(request.offer_letter_url || request.supporting_document_url || (request as Partial<ApiNocMyItem>).completion_certificate_url) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Attached Documents</h4>
                  <div className="space-y-2">
                    {request.offer_letter_url && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Offer Letter</p>
                          <p className="text-xs text-muted-foreground break-all">{request.offer_letter_url}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={resolveBackendAssetUrl(request.offer_letter_url)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                    {request.supporting_document_url && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Supporting Document</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {request.supporting_document_name || request.supporting_document_url}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={resolveBackendAssetUrl(request.supporting_document_url)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                    {(request as Partial<ApiNocMyItem>).completion_certificate_url && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Completion Certificate</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {(request as Partial<ApiNocMyItem>).completion_certificate_name
                              || (request as Partial<ApiNocMyItem>).completion_certificate_url}
                          </p>
                        </div>
                        {(request as Partial<ApiNocMyItem>).completion_status && (
                          <Badge
                            variant="outline"
                            className={COMPLETION_STATUS_CONFIG[(request as Partial<ApiNocMyItem>).completion_status!].color}
                          >
                            {COMPLETION_STATUS_CONFIG[(request as Partial<ApiNocMyItem>).completion_status!].label}
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={resolveBackendAssetUrl((request as Partial<ApiNocMyItem>).completion_certificate_url!)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* Application Date */}
            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Request submitted on {format(new Date(request.created_at), 'dd MMM yyyy \'at\' hh:mm a')}</p>
              <p>Last updated: {format(new Date(request.updated_at), 'dd MMM yyyy \'at\' hh:mm a')}</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
