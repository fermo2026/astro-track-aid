-- Update AVD user role to have correct college_id
UPDATE public.user_roles 
SET college_id = 'b0165ba1-9fd2-4e76-9e81-8f625f9d0a64'
WHERE user_id = '42ea0f38-a518-4ba4-968e-eaf0f4e154b6' 
  AND role = 'academic_vice_dean';

-- Create RLS policy for AVD to view violations in their college
CREATE POLICY "AVD can view college violations"
ON public.violations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'academic_vice_dean'
      AND ur.college_id = d.college_id
  )
);

-- Create RLS policy for AVD to update violations in their college
CREATE POLICY "AVD can update college violations"
ON public.violations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'academic_vice_dean'
      AND ur.college_id = d.college_id
  )
);