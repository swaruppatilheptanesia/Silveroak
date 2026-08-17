import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, FileText, Briefcase, Award } from 'lucide-react';
import { formatCGPA } from '@/lib/formatters';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ icon: Icon, label, value, subtext }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
          </div>
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickStatsProps {
  cgpa: number;
  resumeCount: number;
  eligibleCompanies: number;
  certificationCount: number;
}

export function QuickStats({ cgpa, resumeCount, eligibleCompanies, certificationCount }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={TrendingUp}
        label="Current CGPA"
        value={formatCGPA(cgpa)}
        subtext="Semester 7"
      />
      <StatCard
        icon={FileText}
        label="Resumes"
        value={resumeCount}
        subtext="1 Default"
      />
      <StatCard
        icon={Briefcase}
        label="Eligible For"
        value={eligibleCompanies}
        subtext="Companies"
      />
      <StatCard
        icon={Award}
        label="Certifications"
        value={certificationCount}
        subtext="Verified"
      />
    </div>
  );
}
