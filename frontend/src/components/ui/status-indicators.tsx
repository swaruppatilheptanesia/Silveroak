import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Lock, FileCheck } from 'lucide-react';
import { calculateEligibility, isProfileIncomplete, getProfileStatusBadge, MIN_PROFILE_COMPLETION } from '@/lib/validations';
import { formatCGPA } from '@/lib/formatters';
import type { AcademicProfile, StudentMaster } from '@/types/student';

interface ProfileStatusIndicatorProps {
  student: StudentMaster;
  profileCompletion: number;
  showLabel?: boolean;
}

export function ProfileStatusIndicator({ student, profileCompletion, showLabel = true }: ProfileStatusIndicatorProps) {
  const isIncomplete = isProfileIncomplete(profileCompletion);
  const statusBadge = getProfileStatusBadge(profileCompletion);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          {isIncomplete ? (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {showLabel && (
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {profileCompletion}%
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Profile: {profileCompletion}% complete</p>
        {isIncomplete && (
          <p className="text-yellow-400 text-xs">{MIN_PROFILE_COMPLETION}% required for registration</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface EligibilityBadgeProps {
  academicProfile: AcademicProfile;
  minCgpa?: number;
  maxBacklogs?: number;
  showDetails?: boolean;
}

export function EligibilityBadge({ 
  academicProfile, 
  minCgpa = 7.0, 
  maxBacklogs = 0,
  showDetails = false 
}: EligibilityBadgeProps) {
  const eligibility = calculateEligibility(academicProfile, minCgpa, maxBacklogs);

  const statusConfig = {
    eligible: {
      icon: CheckCircle,
      label: 'Eligible',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    conditional: {
      icon: AlertCircle,
      label: 'Conditional',
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    not_eligible: {
      icon: XCircle,
      label: 'Not Eligible',
      variant: 'destructive' as const,
      className: '',
    },
  };

  const config = statusConfig[eligibility.status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
          <Icon className="h-3 w-3" />
          {config.label}
          {showDetails && (
            <Lock className="h-3 w-3 ml-1 opacity-50" />
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="space-y-1">
        <p className="font-medium">Eligibility (Auto-calculated)</p>
        <div className="text-xs space-y-0.5">
          <p className={eligibility.cgpaCheck.passed ? 'text-green-400' : 'text-red-400'}>
            CGPA: {formatCGPA(eligibility.cgpaCheck.value)} (min: {eligibility.cgpaCheck.required})
          </p>
          <p className={eligibility.backlogCheck.passed ? 'text-green-400' : 'text-red-400'}>
            Backlogs: {eligibility.backlogCheck.value} (max: {eligibility.backlogCheck.maxAllowed})
          </p>
          <p className={eligibility.percentageCheck.passed ? 'text-green-400' : 'text-red-400'}>
            10th: {eligibility.percentageCheck.tenthValue}% (min: {eligibility.percentageCheck.required}%)
          </p>
        </div>
        <p className="text-xs text-muted-foreground italic pt-1">Cannot be manually overridden</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface PolicyStatusBadgeProps {
  accepted: boolean;
  acceptedAt?: string;
}

export function PolicyStatusBadge({ accepted, acceptedAt }: PolicyStatusBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={accepted ? 'default' : 'destructive'}
          className={accepted ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1' : 'gap-1'}
        >
          <FileCheck className="h-3 w-3" />
          {accepted ? 'Policy Accepted' : 'Policy Required'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {accepted ? (
          <p>Accepted on {acceptedAt ? new Date(acceptedAt).toLocaleDateString() : 'Unknown date'}</p>
        ) : (
          <p>Policy acceptance is mandatory for placements</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface RegistrationStatusBadgeProps {
  hasRegistered: boolean;
  interestType?: string;
}

export function RegistrationStatusBadge({ hasRegistered, interestType }: RegistrationStatusBadgeProps) {
  if (hasRegistered) {
    return (
      <Badge variant="outline" className="text-green-600 bg-green-500/10 border-green-500/20 gap-1">
        <CheckCircle className="h-3 w-3" />
        Registered
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Registered
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Student must register interest for {interestType?.replace(/_/g, ' ') || 'this program'}</p>
        <p className="text-xs text-muted-foreground">Required to appear in student lists</p>
      </TooltipContent>
    </Tooltip>
  );
}
