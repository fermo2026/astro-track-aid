import { useState } from 'react';
import { Search, Eye, AlertTriangle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ViolationDialog } from '@/components/violations/ViolationDialog';
import { ViolationHistoryDialog } from '@/components/violations/ViolationHistoryDialog';
import { QuickApprovalActions } from '@/components/violations/QuickApprovalActions';
import { PrintableViolationReport } from '@/components/violations/PrintableViolationReport';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/export/ExportButton';
import { Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAcademicSettings } from '@/hooks/useAcademicSettings';

const getStatusColor = (status: string) => {
  const severeDecisions = ['Dismissal', 'Suspension (1 Academic Year)', 'Referred to University Discipline Committee'];
  const warningDecisions = [
    'F Grade for Course', 'F Grade with Academic Probation', 
    'Suspension (1 Semester)', 'Suspension (2 Semesters)',
    'One Grade Deduction', 'Referred to CMC'
  ];
  const pendingDecisions = ['Pending'];
  const clearedDecisions = ['Cleared', 'Verbal Warning', 'Written Warning', 'Uphold DAC Decision'];
  
  if (severeDecisions.includes(status)) return 'bg-destructive/20 text-destructive border-destructive/30';
  if (warningDecisions.includes(status)) return 'bg-warning/10 text-warning border-warning/20';
  if (pendingDecisions.includes(status)) return 'bg-muted text-muted-foreground border-muted';
  if (clearedDecisions.includes(status)) return 'bg-success/10 text-success border-success/20';
  return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
};

// Detail view dialog for a violation
const ViolationDetailDialog = ({ violation, trigger }: { violation: any; trigger: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Case Details
            {violation.is_repeat_offender && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Repeat Offender
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Student Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{violation.students?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono">{violation.students?.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p>{violation.students?.departments?.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Program</p>
                <p>{violation.students?.program}</p>
              </div>
            </div>
          </div>

          {/* Incident Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Course</p>
              <p className="font-semibold">{violation.course_name}</p>
              <p className="text-sm font-mono text-muted-foreground">{violation.course_code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exam Date</p>
              <p className="font-semibold">
                {new Date(violation.incident_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exam Type</p>
              <p>{violation.exam_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invigilator</p>
              <p>{violation.invigilator}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Violation Type</p>
              <Badge variant="outline">{violation.violation_type}</Badge>
            </div>
          </div>

          {/* Decisions */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Decisions</h4>
            <div className="flex gap-4">
              <div className="flex-1 bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">DAC Decision</p>
                <Badge className={cn('border', getStatusColor(violation.dac_decision))}>
                  {violation.dac_decision}
                </Badge>
              </div>
              <div className="flex-1 bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">CMC Decision</p>
                <Badge className={cn('border', getStatusColor(violation.cmc_decision))}>
                  {violation.cmc_decision}
                </Badge>
              </div>
            </div>
          </div>

          {/* Notes */}
          {violation.description && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
              <p className="text-sm whitespace-pre-wrap">{violation.description}</p>
            </div>
          )}

          {/* Print Button */}
          <div className="border-t pt-4 flex justify-end">
            <PrintableViolationReport violation={violation} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Violations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isSystemAdmin, roles } = useAuth();
  const { activeAcademicPeriod, hasActiveAcademicPeriod } = useAcademicSettings();
  
  const isHead = roles.some(r => r.role === 'department_head');
  const isDeputy = roles.some(r => r.role === 'deputy_department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const userDepartmentId = roles.find(r => r.department_id)?.department_id;
  
  const canAddViolation = (isHead || isDeputy) && userDepartmentId;
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Violation Records</h1>
              {activeAcademicPeriod && (
                <Badge variant="secondary" className="font-normal text-sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  {activeAcademicPeriod.academic_year} Sem {activeAcademicPeriod.semester}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Manage and track examination violation cases
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

        {/* Simplified Table */}
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
                      <TableHead className="w-[200px]">Student</TableHead>
                      <TableHead className="w-[80px]">Dept</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[120px] text-center">DAC</TableHead>
                      {canSeeCMC && <TableHead className="w-[120px] text-center">CMC</TableHead>}
                      <TableHead className="w-[140px] text-center">Action</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.map((v: any) => (
                      <TableRow key={v.id} className="hover:bg-muted/30">
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <ViolationHistoryDialog
                              studentId={v.students?.id}
                              studentName={v.students?.full_name}
                              studentIdNumber={v.students?.student_id}
                              trigger={
                                <button className="text-left hover:text-primary transition-colors">
                                  <p className="font-medium text-sm">{v.students?.full_name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{v.students?.student_id}</p>
                                </button>
                              }
                            />
                            {v.is_repeat_offender && (
                              <Badge variant="destructive" className="shrink-0 text-[10px] px-1 py-0 h-4">
                                R
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-xs font-medium">
                            {v.students?.departments?.code || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <p className="text-sm font-medium truncate max-w-[150px]">{v.course_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{v.course_code}</p>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground">
                          {new Date(v.incident_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <Badge 
                            className={cn(
                              'border text-[10px] font-medium',
                              getStatusColor(v.dac_decision)
                            )}
                          >
                            {v.dac_decision}
                          </Badge>
                        </TableCell>
                        {canSeeCMC && (
                          <TableCell className="py-2 text-center">
                            <Badge 
                              className={cn(
                                'border text-[10px] font-medium',
                                getStatusColor(v.cmc_decision)
                              )}
                            >
                              {v.cmc_decision}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="py-2 text-center">
                          <QuickApprovalActions violation={v} />
                        </TableCell>
                        <TableCell className="py-2">
                          <ViolationDetailDialog
                            violation={v}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
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
