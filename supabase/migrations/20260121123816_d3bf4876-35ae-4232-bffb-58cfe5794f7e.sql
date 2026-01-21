-- Create colleges table
CREATE TABLE public.colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on colleges
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Colleges are viewable by authenticated users
CREATE POLICY "Colleges are viewable by authenticated users"
ON public.colleges FOR SELECT
USING (true);

-- Only system admin can manage colleges
CREATE POLICY "System admin can manage colleges"
ON public.colleges FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add college_id to departments
ALTER TABLE public.departments 
ADD COLUMN college_id UUID REFERENCES public.colleges(id);

-- Drop existing department policies
DROP POLICY IF EXISTS "Only VPAA and Main Registrar can manage departments" ON public.departments;

-- System admin can manage all departments
CREATE POLICY "System admin can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Academic vice dean can insert departments
CREATE POLICY "Academic vice dean can add departments"
ON public.departments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'academic_vice_dean'::app_role));

-- Academic vice dean can update departments in their college
CREATE POLICY "Academic vice dean can update departments"
ON public.departments FOR UPDATE
USING (has_role(auth.uid(), 'academic_vice_dean'::app_role));

-- Create function to check if user belongs to department
CREATE OR REPLACE FUNCTION public.user_has_department_access(_user_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (department_id = _department_id OR department_id IS NULL)
  )
$$;

-- Drop existing violation policies
DROP POLICY IF EXISTS "Users with roles can view violations" ON public.violations;

-- System admin and VPAA can view all violations
CREATE POLICY "System admin and VPAA can view all violations"
ON public.violations FOR SELECT
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  has_role(auth.uid(), 'vpaa'::app_role) OR
  has_role(auth.uid(), 'main_registrar'::app_role)
);

-- Department users can view violations in their department
CREATE POLICY "Department users can view their department violations"
ON public.violations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.user_roles ur ON ur.department_id = s.department_id
    WHERE s.id = violations.student_id
      AND ur.user_id = auth.uid()
  )
);

-- Add trigger for updated_at on colleges
CREATE TRIGGER update_colleges_updated_at
BEFORE UPDATE ON public.colleges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();