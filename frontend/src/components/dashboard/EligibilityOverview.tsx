import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, XCircle, AlertCircle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EligibilityCheck, EligibilityStatus } from '@/types/student';

interface EligibilityOverviewProps {
  eligibilityChecks: EligibilityCheck[];
}

const statusConfig: Record<EligibilityStatus, { icon: React.ElementType; variant: 'success' | 'destructive' | 'warning'; label: string }> = {
  eligible: { icon: CheckCircle2, variant: 'success', label: 'Eligible' },
  not_eligible: { icon: XCircle, variant: 'destructive', label: 'Not Eligible' },
  conditional: { icon: AlertCircle, variant: 'warning', label: 'Conditional' },
};

export function EligibilityOverview({ eligibilityChecks }: EligibilityOverviewProps) {
  const eligibleCount = eligibilityChecks.filter(c => c.status === 'eligible').length;
  const conditionalCount = eligibilityChecks.filter(c => c.status === 'conditional').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Eligibility Status</CardTitle>
            <CardDescription className="flex items-center gap-1 text-xs mt-1">
              <Lock className="h-3 w-3" />
              Auto-calculated based on academic profile
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-xs">{eligibleCount} Eligible</Badge>
            {conditionalCount > 0 && (
              <Badge variant="warning" className="text-xs">{conditionalCount} Conditional</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {eligibilityChecks.slice(0, 4).map((check) => {
            const config = statusConfig[check.status];
            const Icon = config.icon;
            return (
              <div key={check.rule_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${
                    check.status === 'eligible' ? 'text-emerald-500' :
                    check.status === 'conditional' ? 'text-amber-500' :
                    'text-destructive'
                  }`} />
                  <span className="text-sm font-medium text-foreground">{check.rule_name}</span>
                </div>
                <Badge variant={config.variant} className="text-xs">
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/opportunities">
            View Opportunities
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
