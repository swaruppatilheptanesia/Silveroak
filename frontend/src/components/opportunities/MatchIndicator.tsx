import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MatchIndicatorProps {
  percentage: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MatchIndicator({ 
  percentage, 
  showLabel = true, 
  size = 'md' 
}: MatchIndicatorProps) {
  const getColorClass = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const getProgressColor = () => {
    if (percentage >= 80) return '[&>div]:bg-green-600';
    if (percentage >= 60) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-muted-foreground';
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Profile Match</span>
          <span className={cn('font-medium', getColorClass())}>{percentage}%</span>
        </div>
      )}
      <Progress 
        value={percentage} 
        className={cn(sizeClasses[size], getProgressColor())}
      />
    </div>
  );
}

export function calculateMatchPercentage(
  studentSkills: string[],
  studentDomains: string[],
  postingSkillRequirements?: string,
  postingBranches?: string[],
  studentBranch?: string
): number {
  let score = 0;
  let total = 0;

  // Branch match (30%)
  if (postingBranches && studentBranch) {
    total += 30;
    if (postingBranches.some(b => 
      studentBranch.toLowerCase().includes(b.toLowerCase()) ||
      b.toLowerCase().includes(studentBranch.split(' ')[0].toLowerCase())
    )) {
      score += 30;
    }
  }

  // Skills match (50%)
  if (postingSkillRequirements && studentSkills.length > 0) {
    total += 50;
    const requiredKeywords = postingSkillRequirements.toLowerCase().split(/[,\s.]+/);
    const matchedSkills = studentSkills.filter(skill =>
      requiredKeywords.some(keyword => 
        skill.toLowerCase().includes(keyword) ||
        keyword.includes(skill.toLowerCase())
      )
    );
    score += Math.min(50, (matchedSkills.length / Math.max(3, requiredKeywords.length / 2)) * 50);
  }

  // Domain interest match (20%)
  if (studentDomains.length > 0) {
    total += 20;
    // Simple heuristic - if student has domain interests, give partial score
    score += studentDomains.length >= 2 ? 20 : 10;
  }

  return total > 0 ? Math.round((score / total) * 100) : 50;
}
