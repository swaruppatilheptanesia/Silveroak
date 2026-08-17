import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  MapPin,
  IndianRupee,
  Download,
  Eye,
  ChevronRight,
  Briefcase,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import type { ApiNocDetail, ApiNocMyItem, NOCRequest } from '@/types/noc';
import {
  NOC_STATUS_CONFIG,
  NOC_TYPE_LABELS,
} from '@/types/noc';
import {
  COMPLETION_STATUS_CONFIG,
  getNocCompanyLocation,
  getNocFacultyApproverName,
  getNocProgramLabel,
  getNocStipendAmount,
  getNocTpoApproverName,
} from '@/lib/nocModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { CompletionCertificateDialog } from './CompletionCertificateDialog';

type NocCardRecord = NOCRequest | ApiNocMyItem | ApiNocDetail;

interface NOCRequestCardProps {
  request: NocCardRecord;
  onViewDetails: (request: NocCardRecord) => void;
}

export function NOCRequestCard({ request, onViewDetails }: NOCRequestCardProps) {
  const statusConfig = NOC_STATUS_CONFIG[request.status];
  const certificateUrl = request.certificate_url ? resolveBackendAssetUrl(request.certificate_url) : null;
  const certificateViewHref = certificateUrl ?? (request.certificate_snapshot ? `/noc/certificate/${request.id}` : null);
  const certificateDownloadHref = certificateUrl ?? (request.certificate_snapshot ? `/noc/certificate/${request.id}?download=1` : null);
  const stipendAmount = getNocStipendAmount(request);
  const facultyApproverName = getNocFacultyApproverName(request);
  const tpoApproverName = getNocTpoApproverName(request);

  // Completion certificate (only meaningful on issued NOCs; fields live on the API records).
  const completionRecord = request as Partial<ApiNocMyItem>;
  const completionStatus = completionRecord.completion_status ?? null;
  const completionUrl = completionRecord.completion_certificate_url
    ? resolveBackendAssetUrl(completionRecord.completion_certificate_url)
    : null;
  const completionRemarks = completionRecord.completion_remarks ?? null;
  const showCompletion = request.status === 'issued';
  const canUploadCompletion = showCompletion && (completionStatus === null || completionStatus === 'rejected');
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onViewDetails(request)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{request.role_title}</h3>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{request.company_name}</span>
              {request.company_verification_status === 'verified' && (
                <Badge variant="outline" className="text-xs">Verified</Badge>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Type & Program */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              <Briefcase className="h-3 w-3 mr-1" />
              {NOC_TYPE_LABELS[request.noc_type]}
            </Badge>
            <Badge variant="outline">{getNocProgramLabel(request.program)}</Badge>
          </div>
          
          {/* Details Row */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {getNocCompanyLocation(request)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(request.start_date), 'dd MMM')} - {request.end_date ? format(new Date(request.end_date), 'dd MMM yyyy') : 'Ongoing'}
            </span>
            {stipendAmount !== null && (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4" />
                {stipendAmount.toLocaleString('en-IN')}/month
              </span>
            )}
          </div>
          
          {/* NOC Number if issued */}
          {request.noc_number && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="text-muted-foreground">NOC No:</span>{' '}
                  <span className="font-medium">{request.noc_number}</span>
                </span>
                {certificateViewHref && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild onClick={(event) => event.stopPropagation()}>
                      {certificateUrl ? (
                        <a href={certificateViewHref} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </a>
                      ) : (
                        <Link to={certificateViewHref}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      )}
                    </Button>
                    <Button size="sm" asChild onClick={(event) => event.stopPropagation()}>
                      {certificateUrl ? (
                        <a href={certificateDownloadHref} download={`${request.noc_number || 'noc-certificate'}.pdf`}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      ) : (
                        <Link to={certificateDownloadHref}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Link>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internship completion certificate (issued NOCs) */}
          {showCompletion && (
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium">Completion Certificate</span>
                <Badge
                  variant="outline"
                  className={completionStatus ? COMPLETION_STATUS_CONFIG[completionStatus].color : undefined}
                >
                  {completionStatus ? COMPLETION_STATUS_CONFIG[completionStatus].label : 'Not Submitted'}
                </Badge>
              </div>
              {completionStatus === 'rejected' && completionRemarks && (
                <p className="text-xs text-red-600">Rejected: {completionRemarks}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {completionUrl && (
                  <Button variant="outline" size="sm" asChild onClick={(event) => event.stopPropagation()}>
                    <a href={completionUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Completion Certificate
                    </a>
                  </Button>
                )}
                {canUploadCompletion && (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setUploadOpen(true);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {completionStatus === 'rejected' ? 'Re-upload' : 'Upload Completion Certificate'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Applied Date */}
          <div className="text-xs text-muted-foreground">
            Applied on {format(new Date(request.created_at), 'dd MMM yyyy')}
          </div>

          {(facultyApproverName || tpoApproverName) && (
            <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              {facultyApproverName ? (
                <p>
                  <span className="font-medium text-foreground">Faculty Approved By:</span>{' '}
                  {facultyApproverName}
                </p>
              ) : null}
              {tpoApproverName ? (
                <p>
                  <span className="font-medium text-foreground">TPO Approved By:</span>{' '}
                  {tpoApproverName}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    {showCompletion && (
      <CompletionCertificateDialog
        nocId={request.id}
        companyName={request.company_name}
        isResubmit={completionStatus === 'rejected'}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    )}
    </>
  );
}
