import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Loader2, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImportDialog } from '@/components/import/ImportDialog';
import { ExportButton } from '@/components/export/ExportButton';
import { StudentEditDialog } from '@/components/students/StudentEditDialog';
import { StudentCreateDialog } from '@/components/students/StudentCreateDialog';
import { StudentDeleteDialog } from '@/components/students/StudentDeleteDialog';
import { ViolationHistoryDialog } from '@/components/violations/ViolationHistoryDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const Students = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const { isSystemAdmin, roles } = useAuth();
  
  const isHead = roles.some(r => r.role === 'department_head' || r.role === 'deputy_department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const canEditStudents = isSystemAdmin || isHead || isAVD;
  const canImportStudents = isSystemAdmin || isAVD;

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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', departmentFilter, programFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
          id,
          student_id,
          full_name,
          program,
          department_id,
          departments(name, code),
          violations(id)
        `)
        .order('full_name');

      if (departmentFilter !== 'all') {
        query = query.eq('department_id', departmentFilter);
      }

      if (programFilter !== 'all') {
        query = query.eq('program', programFilter as 'BSc' | 'MSc' | 'PhD');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
  });

  // Filter by search query
  const filteredStudents = studentsData?.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  // Pagination calculations
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground mt-1">
              Manage all students registered in the system
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEditStudents && <StudentCreateDialog />}
            {canImportStudents && <ImportDialog type="students" />}
            <ExportButton />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select value={departmentFilter} onValueChange={(v) => handleFilterChange(setDepartmentFilter, v)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Departments" />
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
              <Select value={programFilter} onValueChange={(v) => handleFilterChange(setProgramFilter, v)}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  <SelectItem value="BSc">BSc</SelectItem>
                  <SelectItem value="MSc">MSc</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedStudents.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Violations</TableHead>
                      {canEditStudents && <TableHead className="w-16">Edit</TableHead>}
                      {isSystemAdmin && <TableHead className="w-16">Delete</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono">{student.student_id}</TableCell>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>
                          {student.departments ? (
                            <Badge variant="outline">
                              {student.departments.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{student.program}</Badge>
                        </TableCell>
                        <TableCell>
                          <ViolationHistoryDialog
                            studentId={student.id}
                            studentName={student.full_name}
                            studentIdNumber={student.student_id}
                            trigger={
                              student.violations?.length > 0 ? (
                                <button className="cursor-pointer">
                                  <Badge variant="destructive" className="flex items-center gap-1 w-fit hover:bg-destructive/80 transition-colors">
                                    <AlertTriangle className="h-3 w-3" />
                                    {student.violations.length}
                                  </Badge>
                                </button>
                              ) : (
                                <button className="cursor-pointer">
                                  <Badge variant="outline" className="text-muted-foreground hover:bg-muted transition-colors">
                                    None
                                  </Badge>
                                </button>
                              )
                            }
                          />
                        </TableCell>
                        {canEditStudents && (
                          <TableCell>
                            <StudentEditDialog
                              student={{
                                id: student.id,
                                student_id: student.student_id,
                                full_name: student.full_name,
                                program: student.program,
                                department_id: student.department_id,
                              }}
                            />
                          </TableCell>
                        )}
                        {isSystemAdmin && (
                          <TableCell>
                            <StudentDeleteDialog
                              student={{
                                id: student.id,
                                student_id: student.student_id,
                                full_name: student.full_name,
                              }}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalStudents)} of {totalStudents} students
                  </p>
                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">No students found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchQuery || departmentFilter !== 'all' || programFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Import students to get started'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Students;
