import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { History, Loader2, AlertTriangle, CheckCircle, Clock, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ViolationHistoryDialogProps {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  trigger?: React.ReactNode;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Pending':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'Cleared':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'Referred to Discipline Committee':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <FileWarning className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'One Grade Down':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'F Grade for Course':
    case 'F Grade with Disciplinary Action':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'Cleared':
      return 'bg-success/10 text-success border-success/20';
    case 'Referred to Discipline Committee':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getWorkflowLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted_to_head: 'Pending Head Approval',
    approved_by_head: 'Approved by Head',
    submitted_to_avd: 'Pending AVD Review',
    approved_by_avd: 'Approved by AVD',
    pending_cmc: 'Pending CMC Decision',
    cmc_decided: 'CMC Decided',
    closed: 'Closed',
  };
  return labels[status] || status;
};

export const ViolationHistoryDialog = ({
  studentId,
  studentName,
  studentIdNumber,
  trigger,
}: ViolationHistoryDialogProps) => {
  const [open, setOpen] = useState(false);

  const { data: violations, isLoading } = useQuery({
    queryKey: ['student-violations', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .eq('student_id', studentId)
        .order('incident_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const repeatOffenderCount = violations?.length || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1">
            <History className="h-4 w-4" />
            History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Violation History
            {repeatOffenderCount > 1 && (
              <Badge variant="destructive" className="ml-2">
                Repeat Offender ({repeatOffenderCount})
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {studentName} ({studentIdNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : violations && violations.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6 pl-10">
                {violations.map((v, index) => (
                  <div key={v.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-10 top-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      {getStatusIcon(v.dac_decision)}
                    </div>

                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {v.course_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {v.course_code} • {v.exam_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(v.incident_date), 'MMM dd, yyyy')}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {getWorkflowLabel(v.workflow_status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Type:</span>
                          <Badge variant="secondary">{v.violation_type}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">DAC:</span>
                          <Badge className={cn('border', getStatusColor(v.dac_decision))}>
                            {v.dac_decision}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">CMC:</span>
                          <Badge className={cn('border', getStatusColor(v.cmc_decision))}>
                            {v.cmc_decision}
                          </Badge>
                        </div>

                        {v.description && (
                          <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                            {v.description}
                          </p>
                        )}

                        <div className="text-xs text-muted-foreground mt-2">
                          Invigilator: {v.invigilator}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
              <h3 className="text-lg font-semibold">No Violations</h3>
              <p className="text-muted-foreground mt-1">
                This student has no recorded violations.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
