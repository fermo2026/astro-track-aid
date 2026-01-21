import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Loader2 } from 'lucide-react';
import { z } from 'zod';

const violationTypes = [
  'Cheating with Notes',
  'Copying from Another Student',
  'Using Electronic Device',
  'Impersonation',
  'Collaboration',
  'Plagiarism',
  'Other',
];

const dacDecisionStatuses = [
  'Pending',
  'One Grade Down',
  'F Grade for Course',
  'F Grade with Disciplinary Action',
  'Referred to Discipline Committee',
  'Cleared',
];

const cmcDecisionStatuses = [
  'Pending',
  'One Grade Down',
  'F Grade for Course',
  'F Grade with Disciplinary Action',
  'Referred to Discipline Committee',
  'Cleared',
];

const formSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  exam_type: z.enum(['Mid Exam', 'Final Exam']),
  incident_date: z.string().min(1, 'Incident date is required'),
  course_name: z.string().min(1, 'Course name is required').max(100),
  course_code: z.string().min(1, 'Course code is required').max(20),
  invigilator: z.string().min(1, 'Invigilator is required').max(100),
  violation_type: z.string().min(1, 'Violation type is required'),
  dac_decision: z.string().optional(),
  cmc_decision: z.string().optional(),
  description: z.string().max(1000).optional(),
});

interface ViolationDialogProps {
  onSuccess?: () => void;
}

export const ViolationDialog = ({ onSuccess }: ViolationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    exam_type: '',
    incident_date: '',
    course_name: '',
    course_code: '',
    invigilator: '',
    violation_type: '',
    dac_decision: 'Pending',
    cmc_decision: 'Pending',
    description: '',
  });
  const queryClient = useQueryClient();

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, student_id, full_name, departments(name)')
        .order('full_name')
        .limit(10);

      if (studentSearch) {
        query = query.or(`full_name.ilike.%${studentSearch}%,student_id.ilike.%${studentSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        student_id: selectedStudent,
        exam_type: formData.exam_type as 'Mid Exam' | 'Final Exam',
        incident_date: formData.incident_date,
        course_name: formData.course_name.trim(),
        course_code: formData.course_code.trim(),
        invigilator: formData.invigilator.trim(),
        violation_type: formData.violation_type as any,
        dac_decision: formData.dac_decision as any,
        cmc_decision: formData.cmc_decision as any,
        description: formData.description.trim() || null,
      };

      const { error } = await supabase.from('violations').insert(payload);

      if (error) throw error;

      toast.success('Violation record created successfully');
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-violations'] });
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create violation record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setFormData({
      exam_type: '',
      incident_date: '',
      course_name: '',
      course_code: '',
      invigilator: '',
      violation_type: '',
      dac_decision: 'Pending',
      cmc_decision: 'Pending',
      description: '',
    });
  };

  const selectedStudentData = students?.find((s) => s.id === selectedStudent);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Violation Record</DialogTitle>
          <DialogDescription>
            Enter the details of the examination violation incident.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-3">
            <Label>Student *</Label>
            {selectedStudent && selectedStudentData ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedStudentData.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudentData.student_id} • {(selectedStudentData as any).departments?.name}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Search student by name or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : students && students.length > 0 ? (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {students.map((student: any) => (
                      <button
                        key={student.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-0"
                        onClick={() => setSelectedStudent(student.id)}
                      >
                        <p className="font-medium">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.student_id} • {student.departments?.name}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : studentSearch ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Incident Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam Type *</Label>
              <Select
                value={formData.exam_type}
                onValueChange={(v) => setFormData({ ...formData, exam_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mid Exam">Mid Exam</SelectItem>
                  <SelectItem value="Final Exam">Final Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Incident Date *</Label>
              <Input
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Course Name *</Label>
              <Input
                placeholder="Enter course name"
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Course Code *</Label>
              <Input
                placeholder="e.g., CS301"
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                required
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Invigilator *</Label>
              <Input
                placeholder="Enter invigilator name"
                value={formData.invigilator}
                onChange={(e) => setFormData({ ...formData, invigilator: e.target.value })}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Violation Type *</Label>
              <Select
                value={formData.violation_type}
                onValueChange={(v) => setFormData({ ...formData, violation_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select violation type" />
                </SelectTrigger>
                <SelectContent>
                  {violationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DAC Decision - only show for initial recording */}
          <div className="space-y-2">
            <Label>DAC Decision (Initial)</Label>
            <Select
              value={formData.dac_decision}
              onValueChange={(v) => setFormData({ ...formData, dac_decision: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select DAC decision" />
              </SelectTrigger>
              <SelectContent>
                {dacDecisionStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              CMC decision will be set after approval workflow is complete.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Enter any additional notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedStudent}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
