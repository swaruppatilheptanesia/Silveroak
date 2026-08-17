// Generic StatusBadge component for consistent status display
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  VERIFICATION_STATUS_CONFIG,
  ELIGIBILITY_STATUS_CONFIG,
  POSTING_STATUS_CONFIG,
  COMPANY_CLASSIFICATION_CONFIG,
  WORK_MODE_CONFIG,
  type VerificationStatus,
  type EligibilityStatus,
  type PostingStatus,
  type CompanyClassification,
  type WorkMode,
} from '@/lib/constants';
import { formatPostingTypeLabel } from '@/lib/postingModule';

// Type mapping for different status categories
type StatusType =
  | 'verification'
  | 'eligibility'
  | 'posting'
  | 'company'
  | 'postingType'
  | 'workMode';

type StatusValue =
  | VerificationStatus
  | EligibilityStatus
  | PostingStatus
  | CompanyClassification
  | string
  | WorkMode;

interface StatusBadgeProps {
  type: StatusType;
  status: StatusValue;
  showIcon?: boolean;
  showLabel?: boolean;
  tooltip?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

function getConfig(type: StatusType, status: StatusValue) {
  switch (type) {
    case 'verification':
      return VERIFICATION_STATUS_CONFIG[status as VerificationStatus];
    case 'eligibility':
      return ELIGIBILITY_STATUS_CONFIG[status as EligibilityStatus];
    case 'posting':
      return POSTING_STATUS_CONFIG[status as PostingStatus];
    case 'company':
      return COMPANY_CLASSIFICATION_CONFIG[status as CompanyClassification];
    case 'postingType':
      return {
        label: formatPostingTypeLabel(String(status)),
        variant: 'secondary' as const,
        className: 'text-foreground bg-muted/60 border-border',
      };
    case 'workMode':
      return WORK_MODE_CONFIG[status as WorkMode];
    default:
      return null;
  }
}

export function StatusBadge({
  type,
  status,
  showIcon = true,
  showLabel = true,
  tooltip,
  className,
  size = 'default',
}: StatusBadgeProps) {
  const config = getConfig(type, status);
  
  if (!config) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    default: 'text-sm px-2.5 py-0.5 gap-1.5',
    lg: 'text-base px-3 py-1 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const hasIcon = 'icon' in config && config.icon;
  const Icon = hasIcon ? config.icon : null;

  const badge = (
    <Badge
      variant={config.variant}
      className={cn(
        sizeClasses[size],
        'className' in config && config.className,
        'flex items-center',
        className
      )}
    >
      {showIcon && Icon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

// Convenience components for specific status types
export function VerificationBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type' | 'status'> & { status: VerificationStatus }) {
  return <StatusBadge type="verification" status={status} {...props} />;
}

export function EligibilityBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type' | 'status'> & { status: EligibilityStatus }) {
  return <StatusBadge type="eligibility" status={status} {...props} />;
}

export function PostingStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type' | 'status'> & { status: PostingStatus }) {
  return <StatusBadge type="posting" status={status} {...props} />;
}

export function CompanyClassificationBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type' | 'status'> & { status: CompanyClassification }) {
  return <StatusBadge type="company" status={status} {...props} />;
}

export function PostingTypeBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, 'type' | 'status'> & { status: string }) {
  return <StatusBadge type="postingType" status={status} {...props} />;
}

export function WorkModeBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type' | 'status'> & { status: WorkMode }) {
  return <StatusBadge type="workMode" status={status} {...props} />;
}
