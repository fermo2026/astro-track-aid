import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const programs = ['BSc', 'MSc', 'PhD'] as const;

export const StudentCreateDialog = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    department_id: '',
    program: 'BSc' as typeof programs[number],
  });
  const queryClient = useQueryClient();
  const { roles, isSystemAdmin } = useAuth();

  // Check if user is AVD
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const avdCollegeId = roles.find(r => r.role === 'academic_vice_dean')?.college_id;
  
  // Get user's department from their role (for non-AVD users)
  const userDepartmentId = roles.find(r => r.department_id)?.department_id;

  // Fetch departments - AVD sees only their college's departments
  const { data: departments } = useQuery({
    queryKey: ['departments-for-create', avdCollegeId, isAVD, isSystemAdmin],
    queryFn: async () => {
      let query = supabase
        .from('departments')
        .select('id, name, code')
        .order('name');
      
      // AVD can only add students to departments in their college
      if (isAVD && avdCollegeId) {
        query = query.eq('college_id', avdCollegeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // For non-AVD department users, auto-set their department
  const effectiveDepartmentId = isAVD || isSystemAdmin 
    ? formData.department_id 
    : userDepartmentId || formData.department_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const departmentToUse = effectiveDepartmentId;
    
    if (!formData.student_id || !formData.full_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // AVD must select a department
    if ((isAVD || isSystemAdmin) && !departmentToUse) {
      toast.error('Please select a department');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('students').insert({
        student_id: formData.student_id.trim(),
        full_name: formData.full_name.trim(),
        department_id: departmentToUse || null,
        program: formData.program,
      });

      if (error) throw error;

      toast.success('Student created successfully');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('A student with this ID already exists');
      } else {
        toast.error(error.message || 'Failed to create student');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      full_name: '',
      department_id: '',
      program: 'BSc',
    });
  };

  // Determine if department selector should be shown
  const showDepartmentSelector = isAVD || isSystemAdmin;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student's details to register them in the system.
            {isAVD && ' As AVD, you must select a department for this student.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Department selector for AVD and System Admin */}
          {showDepartmentSelector && (
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department_id}
                onValueChange={(v) => setFormData({ ...formData, department_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department first" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="student_id">Student ID *</Label>
            <Input
              id="student_id"
              placeholder="e.g., ETS0123/14"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              placeholder="Enter student's full name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select
              value={formData.program}
              onValueChange={(v) => setFormData({ ...formData, program: v as typeof programs[number] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((prog) => (
                  <SelectItem key={prog} value={prog}>
                    {prog}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
