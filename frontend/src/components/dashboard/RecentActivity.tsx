import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Upload, Bell, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'resume' | 'policy' | 'upload' | 'notification' | 'eligibility';
  title: string;
  description: string;
  timestamp: string;
}

const activityIcons = {
  resume: FileText,
  policy: CheckCircle,
  upload: Upload,
  notification: Bell,
  eligibility: AlertCircle,
};

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'eligibility',
    title: 'New Eligibility Check',
    description: 'You are now eligible for TCS Digital recruitment',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'upload',
    title: 'Resume Uploaded',
    description: 'Software Developer Resume uploaded successfully',
    timestamp: '1 day ago',
  },
  {
    id: '3',
    type: 'policy',
    title: 'Policy Accepted',
    description: 'Placement policy 2024-25 accepted',
    timestamp: '3 days ago',
  },
  {
    id: '4',
    type: 'notification',
    title: 'Profile Reminder',
    description: 'Complete your profile to apply for placements',
    timestamp: '1 week ago',
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const Icon = activityIcons[activity.type];
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">{activity.timestamp}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
