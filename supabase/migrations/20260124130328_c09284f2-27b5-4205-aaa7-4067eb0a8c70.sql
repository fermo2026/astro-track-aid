-- Create academic settings table for year/semester management
CREATE TABLE public.academic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester text NOT NULL CHECK (semester IN ('1', '2', 'Summer')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(academic_year, semester)
);

-- Enable RLS
ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view academic settings
CREATE POLICY "Academic settings are viewable by authenticated users"
ON public.academic_settings
FOR SELECT
USING (true);

-- Only system admin can manage academic settings
CREATE POLICY "System admin can manage academic settings"
ON public.academic_settings
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_academic_settings_updated_at
BEFORE UPDATE ON public.academic_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow system admin to delete students
CREATE POLICY "System admin can delete students"
ON public.students
FOR DELETE
USING (has_role(auth.uid(), 'system_admin'::app_role));