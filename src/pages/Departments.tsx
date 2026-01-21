import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CollegeForm } from '@/components/colleges/CollegeForm';
import { DepartmentForm } from '@/components/departments/DepartmentForm';
import { DeleteDepartmentDialog } from '@/components/departments/DeleteDepartmentDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const Departments = () => {
  const { isSystemAdmin, roles } = useAuth();
  const isAcademicViceDean = roles.some(r => r.role === 'academic_vice_dean');
  const canAddDepartment = isSystemAdmin || isAcademicViceDean;

  const { data: colleges, isLoading: collegesLoading } = useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*, colleges(name, code)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = collegesLoading || departmentsLoading;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Organization</h1>
            <p className="text-muted-foreground mt-1">
              Manage colleges and departments
            </p>
          </div>
        </div>

        <Tabs defaultValue="departments" className="w-full">
          <TabsList>
            <TabsTrigger value="departments">
              <Building2 className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="colleges">
              <GraduationCap className="h-4 w-4 mr-2" />
              Colleges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Departments</h2>
              {canAddDepartment && <DepartmentForm />}
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : departments && departments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>College</TableHead>
                        {canAddDepartment && <TableHead className="w-24">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dept.code}</Badge>
                          </TableCell>
                          <TableCell>
                            {dept.colleges ? (
                              <span>{dept.colleges.name} ({dept.colleges.code})</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {canAddDepartment && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DepartmentForm
                                  department={{
                                    id: dept.id,
                                    name: dept.name,
                                    code: dept.code,
                                    college_id: dept.college_id,
                                  }}
                                />
                                <DeleteDepartmentDialog
                                  department={{ id: dept.id, name: dept.name }}
                                />
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No departments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colleges" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Colleges</h2>
              {isSystemAdmin && <CollegeForm />}
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : colleges && colleges.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>College Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Departments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colleges.map((college) => {
                        const deptCount = departments?.filter(d => d.college_id === college.id).length || 0;
                        return (
                          <TableRow key={college.id}>
                            <TableCell className="font-medium">{college.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{college.code}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{deptCount} dept{deptCount !== 1 ? 's' : ''}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No colleges found</p>
                    {isSystemAdmin && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Add colleges to organize departments
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Departments;
