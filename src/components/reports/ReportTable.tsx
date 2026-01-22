import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ViolationReportData } from '@/hooks/useReportData';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface ReportTableProps {
  data: ViolationReportData[];
}

const getStatusBadge = (dacDecision: string, cmcDecision: string) => {
  if (dacDecision === 'Pending' || cmcDecision === 'Pending') {
    return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
  }
  return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Resolved</Badge>;
};

const getDecisionBadge = (decision: string) => {
  const colorMap: Record<string, string> = {
    Pending: 'bg-muted text-muted-foreground',
    'One Grade Down': 'bg-warning/10 text-warning border-warning/30',
    'F Grade for Course': 'bg-destructive/10 text-destructive border-destructive/30',
    'F Grade with Disciplinary Action': 'bg-destructive/20 text-destructive border-destructive/50',
    'Referred to Discipline Committee': 'bg-info/10 text-info border-info/30',
    Cleared: 'bg-success/10 text-success border-success/30',
  };
  return (
    <Badge variant="outline" className={colorMap[decision] || 'bg-muted text-muted-foreground'}>
      {decision}
    </Badge>
  );
};

export const ReportTable = ({ data }: ReportTableProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No violations found matching the selected filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Violations Report ({data.length} records)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Incident Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Exam Type</TableHead>
                <TableHead>Violation Type</TableHead>
                <TableHead>DAC Decision</TableHead>
                <TableHead>CMC Decision</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v) => (
                <TableRow key={v.id} className="data-table-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{v.students?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{v.students?.student_id}</p>
                      </div>
                      {v.is_repeat_offender && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{v.students?.departments?.name || '-'}</TableCell>
                  <TableCell>{v.students?.program}</TableCell>
                  <TableCell>{format(new Date(v.incident_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{v.course_name}</p>
                      <p className="text-sm text-muted-foreground">{v.course_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>{v.exam_type}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{v.violation_type}</Badge>
                  </TableCell>
                  <TableCell>{getDecisionBadge(v.dac_decision)}</TableCell>
                  <TableCell>{getDecisionBadge(v.cmc_decision)}</TableCell>
                  <TableCell>{getStatusBadge(v.dac_decision, v.cmc_decision)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
