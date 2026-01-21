import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ViolationDialog } from '@/components/violations/ViolationDialog';
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
import { supabase } from '@/integrations/supabase/client';
import { ExportButton } from '@/components/export/ExportButton';
import { Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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

const Violations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isSystemAdmin, roles } = useAuth();
  
  const isHead = roles.some(r => r.role === 'department_head' || r.role === 'deputy_department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const canAddViolation = isSystemAdmin || isHead || isAVD;

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
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Violation Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>DAC</TableHead>
                      <TableHead>CMC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{v.students?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{v.students?.student_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.students?.departments?.code || '—'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{v.course_name}</p>
                            <p className="text-sm text-muted-foreground">{v.course_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{v.violation_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(v.incident_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border', getStatusColor(v.dac_decision))}>
                            {v.dac_decision}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border', getStatusColor(v.cmc_decision))}>
                            {v.cmc_decision}
                          </Badge>
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
