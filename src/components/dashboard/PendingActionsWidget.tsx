import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  ArrowRight, 
  FileCheck, 
  Send, 
  Gavel,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PendingAction {
  type: 'submit_to_head' | 'approve_head' | 'submit_to_avd' | 'approve_avd' | 'cmc_decision';
  count: number;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

export const PendingActionsWidget = () => {
  const navigate = useNavigate();
  const { roles, isSystemAdmin } = useAuth();
  
  const isHead = roles.some(r => r.role === 'department_head');
  const isDeputy = roles.some(r => r.role === 'deputy_department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const userDepartmentId = roles.find(r => r.department_id)?.department_id;

  const { data: pendingCounts, isLoading } = useQuery({
    queryKey: ['pending-actions', roles],
    queryFn: async () => {
      const counts: Record<string, number> = {
        draft: 0,
        submitted_to_head: 0,
        approved_by_head: 0,
        submitted_to_avd: 0,
        approved_by_avd: 0,
        pending_cmc: 0,
      };

      // Fetch violations based on workflow status
      let query = supabase
        .from('violations')
        .select('workflow_status, students!inner(department_id)');

      // Filter by department for non-admin users
      if (!isSystemAdmin && userDepartmentId) {
        query = query.eq('students.department_id', userDepartmentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      data?.forEach((v: any) => {
        if (counts[v.workflow_status] !== undefined) {
          counts[v.workflow_status]++;
        }
      });

      return counts;
    },
    enabled: !!(isHead || isDeputy || isAVD || isSystemAdmin),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Build pending actions based on user role
  const pendingActions: PendingAction[] = [];

  if (isDeputy || isHead) {
    // Draft cases to submit to head
    if ((pendingCounts?.draft || 0) > 0) {
      pendingActions.push({
        type: 'submit_to_head',
        count: pendingCounts?.draft || 0,
        label: 'Drafts to Submit',
        description: 'Cases ready to submit to Department Head',
        icon: Send,
        color: 'bg-blue-500',
      });
    }
  }

  if (isHead) {
    // Cases pending head approval
    if ((pendingCounts?.submitted_to_head || 0) > 0) {
      pendingActions.push({
        type: 'approve_head',
        count: pendingCounts?.submitted_to_head || 0,
        label: 'Awaiting Your Approval',
        description: 'Cases submitted for your review',
        icon: FileCheck,
        color: 'bg-orange-500',
      });
    }

    // Cases to submit to AVD
    if ((pendingCounts?.approved_by_head || 0) > 0) {
      pendingActions.push({
        type: 'submit_to_avd',
        count: pendingCounts?.approved_by_head || 0,
        label: 'Submit to AVD',
        description: 'Approved cases to forward to Academic Vice Dean',
        icon: Send,
        color: 'bg-purple-500',
      });
    }
  }

  if (isAVD) {
    // Cases pending AVD approval
    if ((pendingCounts?.submitted_to_avd || 0) > 0) {
      pendingActions.push({
        type: 'approve_avd',
        count: pendingCounts?.submitted_to_avd || 0,
        label: 'Awaiting Your Approval',
        description: 'Cases submitted for AVD review',
        icon: FileCheck,
        color: 'bg-orange-500',
      });
    }

    // Cases pending CMC decision
    if ((pendingCounts?.pending_cmc || 0) > 0) {
      pendingActions.push({
        type: 'cmc_decision',
        count: pendingCounts?.pending_cmc || 0,
        label: 'CMC Decisions Required',
        description: 'Cases awaiting College Management Council decision',
        icon: Gavel,
        color: 'bg-red-500',
      });
    }
  }

  const totalPending = pendingActions.reduce((acc, action) => acc + action.count, 0);

  if (!isHead && !isDeputy && !isAVD && !isSystemAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pending Actions</CardTitle>
            {totalPending > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalPending}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/violations')}>
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <CardDescription>
          Cases requiring your attention based on your role
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : pendingActions.length > 0 ? (
          <div className="space-y-3">
            {pendingActions.map((action) => (
              <div
                key={action.type}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate('/violations')}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {action.count}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No pending actions</p>
            <p className="text-xs text-muted-foreground">All caught up!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
