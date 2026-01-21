import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ViolationRecord } from '@/types/violation';
import { mockViolations } from '@/data/mockData';
import { cn } from '@/lib/utils';

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

// Group violations by student ID
const groupViolationsByStudent = (violations: ViolationRecord[]) => {
  const grouped: Record<string, ViolationRecord[]> = {};
  violations.forEach((v) => {
    if (!grouped[v.studentId]) {
      grouped[v.studentId] = [];
    }
    grouped[v.studentId].push(v);
  });
  return grouped;
};

interface StudentRowProps {
  studentId: string;
  violations: ViolationRecord[];
}

const StudentRow = ({ studentId, violations }: StudentRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const latestViolation = violations[0];
  const hasMultiple = violations.length > 1;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <tr className={cn(
          'data-table-row border-b border-border/50 cursor-pointer',
          hasMultiple && 'hover:bg-primary/5'
        )}>
          <td className="py-3 px-4">
            <div className="flex items-center gap-2">
              {hasMultiple && (
                isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <span className="font-medium text-foreground">{latestViolation.studentFullName}</span>
                {hasMultiple && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {violations.length} violations
                  </Badge>
                )}
              </div>
            </div>
          </td>
          <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{studentId}</td>
          <td className="py-3 px-4 text-muted-foreground">{latestViolation.department}</td>
          <td className="py-3 px-4 text-muted-foreground">{latestViolation.program}</td>
          <td className="py-3 px-4">
            <Badge variant="outline">{latestViolation.examType}</Badge>
          </td>
          <td className="py-3 px-4 text-muted-foreground">
            {new Date(latestViolation.incidentDate).toLocaleDateString()}
          </td>
          <td className="py-3 px-4">
            <Badge variant="outline">{latestViolation.violationType}</Badge>
          </td>
          <td className="py-3 px-4">
            <Badge className={cn('border', getStatusColor(latestViolation.dacDecision))}>
              {latestViolation.dacDecision}
            </Badge>
          </td>
          <td className="py-3 px-4">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      </CollapsibleTrigger>

      {hasMultiple && (
        <CollapsibleContent asChild>
          <>
            {violations.slice(1).map((violation) => (
              <tr key={violation.id} className="bg-muted/30 border-b border-border/30">
                <td className="py-3 px-4 pl-10">
                  <span className="text-muted-foreground text-sm">Previous violation</span>
                </td>
                <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{violation.studentId}</td>
                <td className="py-3 px-4 text-muted-foreground">{violation.department}</td>
                <td className="py-3 px-4 text-muted-foreground">{violation.program}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline">{violation.examType}</Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {new Date(violation.incidentDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline">{violation.violationType}</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge className={cn('border', getStatusColor(violation.dacDecision))}>
                    {violation.dacDecision}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export const ViolationTable = () => {
  const groupedViolations = groupViolationsByStudent(mockViolations);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">All Violation Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Student Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Department</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Program</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Exam Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Violation</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedViolations).map(([studentId, violations]) => (
                <StudentRow key={studentId} studentId={studentId} violations={violations} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
