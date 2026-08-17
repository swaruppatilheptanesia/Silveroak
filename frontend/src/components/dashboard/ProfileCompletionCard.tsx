import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getProfileStatusBadge, getProfileIssues } from '@/lib/validations';
import type { CareerReadinessItem, StudentMaster } from '@/types/student';

interface ProfileCompletionCardProps {
  completionPercentage: number;
  readinessItems: CareerReadinessItem[];
  student: StudentMaster;
  showIssues?: boolean;
}

export function ProfileCompletionCard({ 
  completionPercentage, 
  readinessItems, 
  student,
  showIssues = true 
}: ProfileCompletionCardProps) {
  const completedCount = readinessItems.filter(item => item.completed).length;
  const totalCount = readinessItems.length;
  
  const statusBadge = getProfileStatusBadge(completionPercentage);
  const issues = showIssues ? getProfileIssues(student, completionPercentage) : [];
  const criticalIssues = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Profile Completeness</CardTitle>
          <Badge variant={statusBadge.variant} className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Progress</span>
            <span className="font-semibold text-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Keep your profile updated to improve opportunity matching and visibility.
          </p>
        </div>

        {/* Profile Issues */}
        {criticalIssues.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Required Actions</p>
                <ul className="text-xs text-red-700 dark:text-red-300 mt-1 space-y-0.5">
                  {criticalIssues.slice(0, 3).map((issue, idx) => (
                    <li key={idx}>• {issue.issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {warnings.length > 0 && criticalIssues.length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Recommendations</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 space-y-0.5">
                  {warnings.map((issue, idx) => (
                    <li key={idx}>• {issue.issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Career Readiness ({completedCount}/{totalCount})</h4>
          <div className="space-y-2">
            {readinessItems.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted flex-shrink-0" />
                )}
                <span className={item.completed ? 'text-muted line-through' : 'text-foreground'}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/profile">
            {completionPercentage < 100 ? 'Complete Profile' : 'View Profile'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
