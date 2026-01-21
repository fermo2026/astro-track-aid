-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'deputy_department_head',
  'department_head',
  'academic_vice_dean',
  'college_dean',
  'college_registrar',
  'main_registrar',
  'vpaa'
);

-- Create enum for exam types
CREATE TYPE public.exam_type AS ENUM ('Mid Exam', 'Final Exam');

-- Create enum for decision status
CREATE TYPE public.decision_status AS ENUM (
  'Pending',
  'Warning Issued',
  'Grade Penalty',
  'Course Failure',
  'Suspension',
  'Expulsion',
  'Cleared'
);

-- Create enum for violation types
CREATE TYPE public.violation_type AS ENUM (
  'Cheating with Notes',
  'Using Electronic Device',
  'Copying from Another Student',
  'Collaboration',
  'Plagiarism',
  'Impersonation',
  'Other'
);

-- Create enum for programs
CREATE TYPE public.program_type AS ENUM ('BSc', 'MSc', 'PhD');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  program program_type NOT NULL DEFAULT 'BSc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table for authenticated users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create violations table
CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  exam_type exam_type NOT NULL,
  incident_date DATE NOT NULL,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  invigilator TEXT NOT NULL,
  violation_type violation_type NOT NULL,
  description TEXT,
  evidence_url TEXT,
  dac_decision decision_status NOT NULL DEFAULT 'Pending',
  dac_decision_date DATE,
  dac_decision_by UUID REFERENCES auth.users(id),
  cmc_decision decision_status NOT NULL DEFAULT 'Pending',
  cmc_decision_date DATE,
  cmc_decision_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Create function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for departments (readable by all authenticated users)
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only VPAA and Main Registrar can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'vpaa') OR 
    public.has_role(auth.uid(), 'main_registrar')
  );

-- RLS Policies for students (readable by all authenticated with roles)
CREATE POLICY "Students are viewable by users with roles"
  ON public.students FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users with roles can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Users with roles can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users with roles can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles (only high-level roles can manage)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'vpaa') OR 
    public.has_role(auth.uid(), 'main_registrar')
  );

CREATE POLICY "Only VPAA can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'vpaa'));

-- RLS Policies for violations
CREATE POLICY "Users with roles can view violations"
  ON public.violations FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users with roles can create violations"
  ON public.violations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Users with roles can update violations"
  ON public.violations FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updating timestamps
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_violations_updated_at
  BEFORE UPDATE ON public.violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments
INSERT INTO public.departments (name, code) VALUES
  ('Computer Science', 'CS'),
  ('Electrical Engineering', 'EE'),
  ('Mechanical Engineering', 'ME'),
  ('Civil Engineering', 'CE'),
  ('Chemical Engineering', 'CHE'),
  ('Architecture', 'AR'),
  ('Applied Physics', 'AP'),
  ('Applied Mathematics', 'AM');

-- Enable realtime for violations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;