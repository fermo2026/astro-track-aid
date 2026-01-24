-- Add more exam types to the enum
ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'Quiz';
ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'Assignment';
ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'Lab Exam';
ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'Re-exam';
ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'Makeup Exam';

-- Add academic_settings_id to violations table to link to academic period
ALTER TABLE public.violations 
ADD COLUMN IF NOT EXISTS academic_settings_id uuid REFERENCES public.academic_settings(id);

-- RLS policies for College Dean to view violations in their college
CREATE POLICY "College Dean can view college violations" 
ON public.violations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'college_dean'
      AND ur.college_id = d.college_id
  )
);

-- RLS policies for College Registrar to view violations in their college
CREATE POLICY "College Registrar can view college violations" 
ON public.violations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'college_registrar'
      AND ur.college_id = d.college_id
  )
);