import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle, FileCheck, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import type { NOCStatus } from '@/types/noc';
import { NOC_STATUS_CONFIG } from '@/types/noc';

interface NOCStatusTimelineProps {
  currentStatus: NOCStatus;
  facultyApprovedAt?: string;
  facultyApproverName?: string | null;
  tpoApprovedAt?: string;
  tpoApproverName?: string | null;
  issuedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

const timelineSteps = [
  { key: 'submitted', label: 'Submitted', icon: FileCheck },
  { key: 'faculty', label: 'Faculty Approval', icon: Clock },
  { key: 'tpo', label: 'TPO Approval', icon: Clock },
  { key: 'issued', label: 'NOC Issued', icon: CheckCircle },
];

export function NOCStatusTimeline({ 
  currentStatus, 
  facultyApprovedAt, 
  facultyApproverName,
  tpoApprovedAt, 
  tpoApproverName,
  issuedAt,
  rejectedAt,
  rejectionReason 
}: NOCStatusTimelineProps) {
  const getApprovalMeta = (stepKey: string) => {
    if (stepKey === 'faculty' && facultyApprovedAt) {
      const approvedOn = format(new Date(facultyApprovedAt), 'dd MMM yyyy');
      return facultyApproverName ? `Approved by ${facultyApproverName} on ${approvedOn}` : `Approved on ${approvedOn}`;
    }

    if (stepKey === 'tpo' && tpoApprovedAt) {
      const approvedOn = format(new Date(tpoApprovedAt), 'dd MMM yyyy');
      return tpoApproverName ? `Approved by ${tpoApproverName} on ${approvedOn}` : `Approved on ${approvedOn}`;
    }

    if (stepKey === 'issued' && issuedAt) {
      return `Issued on ${format(new Date(issuedAt), 'dd MMM yyyy')}`;
    }

    if (stepKey === 'submitted' && rejectedAt && currentStatus === 'rejected') {
      return `Closed on ${format(new Date(rejectedAt), 'dd MMM yyyy')}`;
    }

    return null;
  };
  
  const getStepStatus = (stepKey: string): 'completed' | 'current' | 'pending' | 'rejected' => {
    if (currentStatus === 'rejected') {
      if (stepKey === 'submitted') return 'completed';
      if (stepKey === 'faculty' && facultyApprovedAt) return 'completed';
      if (stepKey === 'faculty' && !facultyApprovedAt) return 'rejected';
      if (stepKey === 'tpo' && tpoApprovedAt) return 'rejected';
      return 'pending';
    }
    
    if (currentStatus === 'issued') return 'completed';
    
    if (stepKey === 'submitted') return 'completed';
    
    if (stepKey === 'faculty') {
      if (facultyApprovedAt) return 'completed';
      if (currentStatus === 'pending_faculty') return 'current';
      return 'pending';
    }
    
    if (stepKey === 'tpo') {
      if (tpoApprovedAt) return 'completed';
      if (currentStatus === 'pending_tpo' || currentStatus === 'pending_company_verification') return 'current';
      return 'pending';
    }
    
    if (stepKey === 'issued') {
      if (issuedAt) return 'completed';
      if (currentStatus === 'approved') return 'current';
      return 'pending';
    }
    
    return 'pending';
  };

  const getStepIcon = (stepKey: string, status: 'completed' | 'current' | 'pending' | 'rejected') => {
    if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-500" />;
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    if (status === 'current') return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
    return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className={NOC_STATUS_CONFIG[currentStatus].color}>
          {NOC_STATUS_CONFIG[currentStatus].label}
        </Badge>
      </div>
      
      <div className="relative">
        {timelineSteps.map((step, index) => {
          const status = getStepStatus(step.key);
          const isLast = index === timelineSteps.length - 1;
          const approvalMeta = getApprovalMeta(step.key);
          
          return (
            <div key={step.key} className="flex gap-3">
              {/* Icon and Line */}
              <div className="flex flex-col items-center">
                {getStepIcon(step.key, status)}
                {!isLast && (
                  <div className={`w-0.5 h-8 ${
                    status === 'completed' ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  }`} />
                )}
              </div>
              
              {/* Content */}
              <div className="pb-6">
                <p className={`text-sm font-medium ${
                  status === 'completed' ? 'text-foreground' : 
                  status === 'current' ? 'text-amber-600 dark:text-amber-400' : 
                  status === 'rejected' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </p>
                {status === 'current' && currentStatus === 'pending_company_verification' && step.key === 'tpo' && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Awaiting company verification
                  </p>
                )}
                {approvalMeta ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{approvalMeta}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      
      {currentStatus === 'rejected' && rejectionReason && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Rejection Reason</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{rejectionReason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
