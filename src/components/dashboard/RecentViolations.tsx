import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentViolations } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'Warning Issued':
      return 'bg-info/10 text-info border-info/20';
    case 'Grade Penalty':
    case 'Course Failure':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'Cleared':
      return 'bg-success/10 text-success border-success/20';
    case 'Suspension':
    case 'Expulsion':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const RecentViolations = () => {
  const { data: recentViolations, isLoading } = useRecentViolations();

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Recent Violations</CardTitle>
        <a href="/violations" className="text-sm text-primary hover:underline">
          View all →
        </a>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentViolations && recentViolations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Violation Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentViolations.map((violation: any) => (
                  <tr key={violation.id} className="data-table-row border-b border-border/50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">{violation.students?.full_name}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{violation.students?.student_id}</td>
                    <td className="py-3 px-4 text-muted-foreground">{violation.students?.departments?.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-normal">
                        {violation.violation_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(violation.incident_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={cn('border', getStatusColor(violation.dac_decision))}>
                        {violation.dac_decision}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No violations recorded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
