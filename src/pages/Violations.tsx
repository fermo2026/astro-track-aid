import { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ViolationDialog } from '@/components/violations/ViolationDialog';
import { ViolationHistoryDialog } from '@/components/violations/ViolationHistoryDialog';
import { WorkflowActions } from '@/components/violations/WorkflowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/export/ExportButton';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
    submitted_to_head: 'Pending Head',
    approved_by_head: 'Head Approved',
    submitted_to_avd: 'Pending AVD',
    approved_by_avd: 'AVD Approved',
    pending_cmc: 'Pending CMC',
    cmc_decided: 'CMC Decided',
    closed: 'Closed',
  };
  return labels[status] || status;
};

const getWorkflowColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground';
    case 'submitted_to_head':
    case 'submitted_to_avd':
    case 'pending_cmc':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'approved_by_head':
    case 'approved_by_avd':
      return 'bg-info/10 text-info border-info/20';
    case 'cmc_decided':
    case 'closed':
      return 'bg-success/10 text-success border-success/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const Violations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { isSystemAdmin, roles } = useAuth();
  
  // Only department head or deputy from the same department can create violations
  // System admin cannot create violations - they are management/view-only at this level
  const isHead = roles.some(r => r.role === 'department_head');
  const isDeputy = roles.some(r => r.role === 'deputy_department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const userDepartmentId = roles.find(r => r.department_id)?.department_id;
  
  // Only department head or deputy can ADD violations (not AVD, not system admin)
  const canAddViolation = (isHead || isDeputy) && userDepartmentId;
  
  // CMC decisions only visible to AVD and system admin
  const canSeeCMC = isSystemAdmin || isAVD;

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: violations, isLoading } = useQuery({
    queryKey: ['violations', departmentFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('violations')
        .select(`
          id,
          incident_date,
          course_name,
          course_code,
          exam_type,
          violation_type,
          invigilator,
          dac_decision,
          cmc_decision,
          workflow_status,
          is_repeat_offender,
          description,
          created_at,
          students(id, student_id, full_name, program, department_id, departments(id, name, code))
        `)
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.or('dac_decision.eq.Pending,cmc_decision.eq.Pending');
      } else if (statusFilter === 'resolved') {
        query = query.neq('dac_decision', 'Pending').neq('cmc_decision', 'Pending');
      } else if (statusFilter === 'cleared') {
        query = query.eq('dac_decision', 'Cleared');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredViolations = violations?.filter((v: any) => {
    const matchesSearch =
      v.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.students?.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.course_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      departmentFilter === 'all' || v.students?.departments?.id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Violation Records</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all examination violation cases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton />
            {canAddViolation && <ViolationDialog />}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, ID, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredViolations && filteredViolations.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="min-w-[180px]">
                        <div className="flex items-center gap-1">
                          <span>Student Info</span>
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[100px]">Dept.</TableHead>
                      <TableHead className="min-w-[150px]">Course</TableHead>
                      <TableHead className="min-w-[130px]">Violation Type</TableHead>
                      <TableHead className="min-w-[120px] text-center">Workflow Status</TableHead>
                      <TableHead className="min-w-[130px] text-center">DAC Decision</TableHead>
                      {canSeeCMC && <TableHead className="min-w-[130px] text-center">CMC Decision</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.map((v: any) => (
                      <Collapsible
                        key={v.id}
                        open={expandedRow === v.id}
                        onOpenChange={(open) => setExpandedRow(open ? v.id : null)}
                      >
                        <TableRow className="group cursor-pointer hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center">
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full hover:bg-primary/10"
                              >
                                {expandedRow === v.id ? (
                                  <ChevronUp className="h-4 w-4 text-primary" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <ViolationHistoryDialog
                                  studentId={v.students?.id}
                                  studentName={v.students?.full_name}
                                  studentIdNumber={v.students?.student_id}
                                  trigger={
                                    <button className="text-left hover:text-primary transition-colors">
                                      <p className="font-semibold text-foreground truncate">{v.students?.full_name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{v.students?.student_id}</p>
                                    </button>
                                  }
                                />
                              </div>
                              {v.is_repeat_offender && (
                                <Badge variant="destructive" className="shrink-0 text-xs px-2 py-0.5">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Repeat
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {v.students?.departments?.code || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground line-clamp-1">{v.course_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{v.course_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className="whitespace-nowrap text-xs font-medium"
                            >
                              {v.violation_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                'border whitespace-nowrap text-xs font-medium',
                                getWorkflowColor(v.workflow_status)
                              )}
                            >
                              {getWorkflowLabel(v.workflow_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                'border whitespace-nowrap text-xs font-medium',
                                getStatusColor(v.dac_decision)
                              )}
                            >
                              {v.dac_decision}
                            </Badge>
                          </TableCell>
                          {canSeeCMC && (
                            <TableCell className="text-center">
                              <Badge 
                                className={cn(
                                  'border whitespace-nowrap text-xs font-medium',
                                  getStatusColor(v.cmc_decision)
                                )}
                              >
                                {v.cmc_decision}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={canSeeCMC ? 8 : 7} className="p-0">
                              <div className="bg-muted/20 border-y border-border/50 px-8 py-5">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Incident Date
                                      </span>
                                      <p className="font-semibold text-foreground">
                                        {new Date(v.incident_date).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Exam Type
                                      </span>
                                      <p className="font-semibold text-foreground">{v.exam_type}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Invigilator
                                      </span>
                                      <p className="font-semibold text-foreground">{v.invigilator}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Program
                                      </span>
                                      <p className="font-semibold text-foreground">{v.students?.program}</p>
                                    </div>
                                  </div>
                                  
                                  {v.description && (
                                    <div className="space-y-1 pt-2 border-t border-border/50">
                                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Additional Notes
                                      </span>
                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                        {v.description}
                                      </p>
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-border/50">
                                    <WorkflowActions
                                      violation={v}
                                      onClose={() => setExpandedRow(null)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-20">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">No violations found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No violation records have been created yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Violations;
