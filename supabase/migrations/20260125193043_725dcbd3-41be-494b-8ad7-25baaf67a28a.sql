-- Allow AVD to create violations for students in their college
CREATE POLICY "AVD can create college violations"
ON public.violations
FOR INSERT
WITH CHECK (
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