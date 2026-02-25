import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Plus, Loader2, AlertTriangle, Star, Calendar, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { violationTypes, dacDecisionOptions, cmcDecisionOptions, examTypes } from '@/constants/violationOptions';
import { checkRepeatOffender, getRiskLevelColor, type RepeatOffenderInfo } from '@/utils/repeatOffenderDetection';
import { useAcademicSettings } from '@/hooks/useAcademicSettings';

const formSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  exam_type: z.enum(['Mid Exam', 'Final Exam', 'Quiz', 'Assignment', 'Lab Exam', 'Re-exam', 'Makeup Exam']),
  incident_date: z.string().min(1, 'Incident date is required'),
  course_name: z.string().min(1, 'Course name is required').max(100),
  course_code: z.string().min(1, 'Course code is required').max(20),
  invigilator: z.string().min(1, 'Invigilator is required').max(100),
  violation_type: z.string().min(1, 'Violation type is required'),
  dac_decision: z.string().optional(),
  cmc_decision: z.string().optional(),
  description: z.string().max(1000).optional(),
  academic_settings_id: z.string().min(1, 'Academic period is required'),
});

interface ViolationDialogProps {
  onSuccess?: () => void;
}

export const ViolationDialog = ({ onSuccess }: ViolationDialogProps) => {
  const { roles, isSystemAdmin } = useAuth();
  const { activeAcademicPeriod, hasActiveAcademicPeriod, isLoading: academicLoading } = useAcademicSettings();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [repeatOffenderInfo, setRepeatOffenderInfo] = useState<RepeatOffenderInfo | null>(null);
  const [isCheckingRepeat, setIsCheckingRepeat] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
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
  
  // Check if user is AVD (can create violations for any department in their college)
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const avdCollegeId = roles.find(r => r.role === 'academic_vice_dean')?.college_id;
  
  // Get user's department from their role (for non-AVD users)
  const userDepartmentId = roles.find(r => r.department_id)?.department_id;
  
  // Fetch departments for AVD's college (for department selector)
  const { data: avdDepartments } = useQuery({
    queryKey: ['avd-departments-list', avdCollegeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('college_id', avdCollegeId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isAVD && !!avdCollegeId && open,
  });

  // Check repeat offender status when student is selected
  useEffect(() => {
    const checkStudent = async () => {
      if (!selectedStudent) {
        setRepeatOffenderInfo(null);
        return;
      }
      
      setIsCheckingRepeat(true);
      try {
        const info = await checkRepeatOffender(selectedStudent);
        setRepeatOffenderInfo(info);
        
        // Auto-suggest penalty based on history
        if (info.isRepeatOffender) {
          setFormData(prev => ({
            ...prev,
            dac_decision: info.suggestedDACDecision,
          }));
          
          toast.warning(`⚠️ Repeat Offender Detected`, {
            description: `This student has ${info.priorViolationCount} prior violation(s). Suggested penalty applied.`,
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('Error checking repeat offender:', error);
      } finally {
        setIsCheckingRepeat(false);
      }
    };
    
    checkStudent();
  }, [selectedStudent]);

  // Fetch departments for AVD's college (for filtering students)
  const { data: collegeDepartments } = useQuery({
    queryKey: ['college-departments', avdCollegeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id')
        .eq('college_id', avdCollegeId!);
      if (error) throw error;
      return data?.map(d => d.id) || [];
    },
    enabled: isAVD && !!avdCollegeId,
  });

  // Determine which department to filter students by
  // AVD searches across all college departments (no manual selection needed)
  const effectiveDepartmentId = isAVD ? null : userDepartmentId;

  // Fetch students - AVD searches across all college departments, others search their own
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-search', studentSearch, effectiveDepartmentId, isAVD, collegeDepartments],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, student_id, full_name, department_id, departments(name)')
        .or(`full_name.ilike.%${studentSearch}%,student_id.ilike.%${studentSearch}%`)
        .order('full_name')
        .limit(10);
      
      if (isAVD && collegeDepartments && collegeDepartments.length > 0) {
        // AVD: filter to students in any department of their college
        query = query.in('department_id', collegeDepartments);
      } else if (effectiveDepartmentId) {
        query = query.eq('department_id', effectiveDepartmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && studentSearch.length >= 2 && (isAVD ? (collegeDepartments && collegeDepartments.length > 0) : !!effectiveDepartmentId),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate academic period is required for non-admins
      if (!activeAcademicPeriod && !isSystemAdmin) {
        toast.error('No active academic period set');
        return;
      }

      // Check repeat offender and set flag on violation
      const isRepeat = repeatOffenderInfo?.isRepeatOffender || false;
      
      // For AVD-created violations, set workflow status to cmc_decided if CMC decision is not Pending
      const workflowStatus = isAVD && formData.cmc_decision !== 'Pending' 
        ? 'cmc_decided' 
        : 'draft';
      
      const payload = {
        student_id: selectedStudent,
        exam_type: formData.exam_type as any,
        incident_date: formData.incident_date,
        course_name: formData.course_name.trim(),
        course_code: formData.course_code.trim(),
        invigilator: formData.invigilator.trim(),
        violation_type: formData.violation_type as any,
        dac_decision: formData.dac_decision as any,
        cmc_decision: formData.cmc_decision as any,
        description: formData.description.trim() || null,
        is_repeat_offender: isRepeat,
        academic_settings_id: activeAcademicPeriod?.id || null,
        workflow_status: workflowStatus as any,
        // If AVD is setting decisions, record them as the decision maker
        ...(isAVD && formData.dac_decision !== 'Pending' && {
          dac_decision_date: new Date().toISOString().split('T')[0],
        }),
        ...(isAVD && formData.cmc_decision !== 'Pending' && {
          cmc_decision_date: new Date().toISOString().split('T')[0],
        }),
      };

      const { error } = await supabase.from('violations').insert(payload);

      if (error) throw error;

      const notificationMessage = isRepeat 
        ? `⚠️ Repeat offender violation recorded. Prior violations: ${repeatOffenderInfo?.priorViolationCount}`
        : 'Violation record created successfully';
      
      toast.success(notificationMessage);
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
    setRepeatOffenderInfo(null);
    setSelectedDepartmentId('');
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
          {activeAcademicPeriod && (
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="h-4 w-4 text-primary" />
              <Badge variant="outline" className="font-normal">
                {activeAcademicPeriod.academic_year} - Semester {activeAcademicPeriod.semester}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* No Active Academic Period Warning */}
        {!academicLoading && !hasActiveAcademicPeriod && !isSystemAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Active Academic Period</AlertTitle>
            <AlertDescription>
              System administrator has not set an active academic year/semester. 
              Please contact your system administrator.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AVD info - department auto-detected from student */}
          {isAVD && (
            <Alert>
              <AlertDescription className="text-sm">
                Department will be automatically assigned based on the selected student's information.
              </AlertDescription>
            </Alert>
          )}

          {/* Student Selection */}
          <div className="space-y-2">
            <Label>Student *</Label>
            {selectedStudent && selectedStudentData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium">{selectedStudentData.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedStudentData.student_id} • {(selectedStudentData as any).departments?.name}
                      </p>
                    </div>
                    {isCheckingRepeat && <Loader2 className="h-4 w-4 animate-spin" />}
                    {repeatOffenderInfo?.isRepeatOffender && (
                      <Badge className={getRiskLevelColor(repeatOffenderInfo.riskLevel)}>
                        {repeatOffenderInfo.priorViolationCount} Prior Offense{repeatOffenderInfo.priorViolationCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                    Change
                  </Button>
                </div>
                
                {/* Repeat Offender Alert */}
                {repeatOffenderInfo?.isRepeatOffender && (
                  <Alert variant="destructive" className="border-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-bold">Repeat Offender Alert</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>{repeatOffenderInfo.escalationMessage}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-background">
                          Suggested DAC: {repeatOffenderInfo.suggestedDACDecision}
                        </Badge>
                        <Badge variant="outline" className="bg-background">
                          Suggested CMC: {repeatOffenderInfo.suggestedCMCDecision}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Type student ID or name to search..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {studentSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : students && students.length > 0 ? (
                      students.map((student: any) => (
                        <button
                          key={student.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-0"
                          onClick={() => {
                            setSelectedStudent(student.id);
                            setStudentSearch('');
                          }}
                        >
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.student_id} • {student.departments?.name}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
                    )}
                  </div>
                )}
                {studentSearch.length > 0 && studentSearch.length < 2 && (
                  <p className="text-xs text-muted-foreground mt-1">Type at least 2 characters to search</p>
                )}
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
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
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

          {/* DAC Decision */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              DAC Decision {isAVD ? '' : '(Initial)'}
              {repeatOffenderInfo?.isRepeatOffender && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  <Star className="h-3 w-3 mr-1 fill-warning text-warning" />
                  Suggested: {repeatOffenderInfo.suggestedDACDecision}
                </Badge>
              )}
            </Label>
            <Select
              value={formData.dac_decision}
              onValueChange={(v) => setFormData({ ...formData, dac_decision: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select DAC decision" />
              </SelectTrigger>
              <SelectContent>
                {dacDecisionOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <span className="flex items-center gap-2">
                      {status}
                      {repeatOffenderInfo?.suggestedDACDecision === status && repeatOffenderInfo?.isRepeatOffender && (
                        <Star className="h-3 w-3 fill-warning text-warning" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAVD && (
              <p className="text-xs text-muted-foreground">
                {repeatOffenderInfo?.isRepeatOffender 
                  ? '⚠️ Escalated penalty suggested based on ASTU legislation. CMC decision will be set after approval workflow.'
                  : 'CMC decision will be set after approval workflow is complete.'}
              </p>
            )}
          </div>

          {/* CMC Decision - Only for AVD */}
          {isAVD && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                CMC Decision
                {repeatOffenderInfo?.isRepeatOffender && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    <Star className="h-3 w-3 mr-1 fill-warning text-warning" />
                    Suggested: {repeatOffenderInfo.suggestedCMCDecision}
                  </Badge>
                )}
              </Label>
              <Select
                value={formData.cmc_decision}
                onValueChange={(v) => setFormData({ ...formData, cmc_decision: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CMC decision" />
                </SelectTrigger>
                <SelectContent>
                  {cmcDecisionOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="flex items-center gap-2">
                        {status}
                        {repeatOffenderInfo?.suggestedCMCDecision === status && repeatOffenderInfo?.isRepeatOffender && (
                          <Star className="h-3 w-3 fill-warning text-warning" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                As AVD, you can set both DAC and CMC decisions simultaneously.
              </p>
            </div>
          )}

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
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedStudent || (!hasActiveAcademicPeriod && !isSystemAdmin)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
