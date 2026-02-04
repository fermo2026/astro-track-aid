# Database Migration Guide: Lovable Cloud to External Supabase

This guide provides step-by-step instructions to migrate your entire database from Lovable Cloud to your own external Supabase project.

## Prerequisites

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Have access to the SQL Editor in your new Supabase project
3. Export data from Lovable Cloud (see Step 2)

---

## Step 1: Create Database Schema

Run these SQL commands in order in your new Supabase project's SQL Editor:

### 1.1 Create Enums

```sql
-- Create all custom enum types
CREATE TYPE public.app_role AS ENUM (
  'deputy_department_head',
  'department_head',
  'academic_vice_dean',
  'college_dean',
  'college_registrar',
  'main_registrar',
  'vpaa',
  'system_admin'
);

CREATE TYPE public.decision_status AS ENUM (
  'Pending',
  'Warning Issued',
  'Grade Penalty',
  'Course Failure',
  'Suspension',
  'Expulsion',
  'Cleared',
  'One Grade Down',
  'F Grade for Course',
  'F Grade with Disciplinary Action',
  'Referred to Discipline Committee',
  'F Grade with Academic Probation',
  'Verbal Warning',
  'Written Warning',
  'One Grade Deduction',
  'Referred to CMC',
  'Uphold DAC Decision',
  'Suspension (1 Semester)',
  'Suspension (2 Semesters)',
  'Suspension (1 Academic Year)',
  'Dismissal',
  'Referred to University Discipline Committee'
);

CREATE TYPE public.exam_type AS ENUM (
  'Mid Exam',
  'Final Exam',
  'Quiz',
  'Assignment',
  'Lab Exam',
  'Re-exam',
  'Makeup Exam'
);

CREATE TYPE public.notification_type AS ENUM (
  'case_submitted',
  'case_approved',
  'action_required',
  'decision_made'
);

CREATE TYPE public.program_type AS ENUM ('BSc', 'MSc', 'PhD');

CREATE TYPE public.violation_type AS ENUM (
  'Cheating with Notes',
  'Using Electronic Device',
  'Copying from Another Student',
  'Collaboration',
  'Plagiarism',
  'Impersonation',
  'Other'
);

CREATE TYPE public.workflow_status AS ENUM (
  'draft',
  'submitted_to_head',
  'approved_by_head',
  'submitted_to_avd',
  'approved_by_avd',
  'pending_cmc',
  'cmc_decided',
  'closed'
);
```

### 1.2 Create Tables

```sql
-- Academic Settings
CREATE TABLE public.academic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester text NOT NULL,
  academic_year text NOT NULL,
  created_by uuid,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Colleges
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  college_id uuid REFERENCES public.colleges(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  department_id uuid REFERENCES public.departments(id),
  college_id uuid REFERENCES public.colleges(id),
  must_change_password boolean NOT NULL DEFAULT false,
  invited_by uuid,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  college_id uuid REFERENCES public.colleges(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  full_name text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  program public.program_type NOT NULL DEFAULT 'BSc',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Violations
CREATE TABLE public.violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  exam_type public.exam_type NOT NULL,
  incident_date date NOT NULL,
  violation_type public.violation_type NOT NULL,
  course_name text NOT NULL,
  course_code text NOT NULL,
  invigilator text NOT NULL,
  description text,
  evidence_url text,
  dac_decision public.decision_status NOT NULL DEFAULT 'Pending',
  dac_decision_date date,
  dac_decision_by uuid,
  cmc_decision public.decision_status NOT NULL DEFAULT 'Pending',
  cmc_decision_date date,
  cmc_decision_by uuid,
  workflow_status public.workflow_status NOT NULL DEFAULT 'draft',
  submitted_by uuid,
  submitted_at timestamptz,
  approved_by_head uuid,
  head_approved_at timestamptz,
  approved_by_avd uuid,
  avd_approved_at timestamptz,
  is_repeat_offender boolean NOT NULL DEFAULT false,
  academic_settings_id uuid REFERENCES public.academic_settings(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  violation_id uuid REFERENCES public.violations(id),
  title text NOT NULL,
  message text NOT NULL,
  type public.notification_type NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 1.3 Create Database Functions

```sql
-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
      AND role = _role
  )
$$;

-- Check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
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
  )
$$;

-- Get user department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS uuid
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

-- Check department access
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

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
```

### 1.4 Create Triggers

```sql
-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 1.5 Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
```

### 1.6 Create RLS Policies

```sql
-- Academic Settings Policies
CREATE POLICY "Academic settings are viewable by authenticated users"
  ON public.academic_settings FOR SELECT USING (true);
CREATE POLICY "System admin can manage academic settings"
  ON public.academic_settings FOR ALL USING (has_role(auth.uid(), 'system_admin'));

-- Colleges Policies
CREATE POLICY "Colleges are viewable by authenticated users"
  ON public.colleges FOR SELECT USING (true);
CREATE POLICY "System admin can manage colleges"
  ON public.colleges FOR ALL USING (has_role(auth.uid(), 'system_admin'));

-- Departments Policies
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT USING (true);
CREATE POLICY "System admin can manage departments"
  ON public.departments FOR ALL USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Academic vice dean can add departments"
  ON public.departments FOR INSERT WITH CHECK (has_role(auth.uid(), 'academic_vice_dean'));
CREATE POLICY "Academic vice dean can update departments"
  ON public.departments FOR UPDATE USING (has_role(auth.uid(), 'academic_vice_dean'));
CREATE POLICY "Academic vice dean can delete departments"
  ON public.departments FOR DELETE USING (has_role(auth.uid(), 'academic_vice_dean'));

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Authenticated users cannot directly insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (false);

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users with roles can view all profiles"
  ON public.profiles FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "System admin can view all profiles"
  ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "System admin can update all profiles"
  ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'system_admin'));

-- Students Policies
CREATE POLICY "Students are viewable by users with roles"
  ON public.students FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Users with roles can insert students"
  ON public.students FOR INSERT WITH CHECK (has_any_role(auth.uid()));
CREATE POLICY "Users with roles can update students"
  ON public.students FOR UPDATE USING (has_any_role(auth.uid()));
CREATE POLICY "System admin can delete students"
  ON public.students FOR DELETE USING (has_role(auth.uid(), 'system_admin'));

-- User Roles Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'vpaa') OR has_role(auth.uid(), 'main_registrar'));
CREATE POLICY "System admin can view all user roles"
  ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "Only VPAA can manage roles"
  ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'vpaa'));
CREATE POLICY "System admin can manage all roles"
  ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'system_admin'));

-- Violations Policies
CREATE POLICY "System admin and VPAA can view all violations"
  ON public.violations FOR SELECT USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'vpaa') OR has_role(auth.uid(), 'main_registrar'));
CREATE POLICY "Department users can view their department violations"
  ON public.violations FOR SELECT USING (EXISTS (
    SELECT 1 FROM students s
    JOIN user_roles ur ON ur.department_id = s.department_id
    WHERE s.id = violations.student_id AND ur.user_id = auth.uid()
  ));
CREATE POLICY "AVD can view college violations"
  ON public.violations FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'academic_vice_dean' AND ur.college_id = d.college_id
  ));
CREATE POLICY "College Dean can view college violations"
  ON public.violations FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'college_dean' AND ur.college_id = d.college_id
  ));
CREATE POLICY "College Registrar can view college violations"
  ON public.violations FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'college_registrar' AND ur.college_id = d.college_id
  ));
CREATE POLICY "Users with roles can create violations"
  ON public.violations FOR INSERT WITH CHECK (has_any_role(auth.uid()));
CREATE POLICY "AVD can create college violations"
  ON public.violations FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'academic_vice_dean' AND ur.college_id = d.college_id
  ));
CREATE POLICY "Users with roles can update violations"
  ON public.violations FOR UPDATE USING (has_any_role(auth.uid()));
CREATE POLICY "AVD can update college violations"
  ON public.violations FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN students s ON s.id = violations.student_id
    JOIN departments d ON d.id = s.department_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'academic_vice_dean' AND ur.college_id = d.college_id
  ));
```

### 1.7 Create Storage Bucket

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Step 2: Export Data from Lovable Cloud

You can view and export your data from the Lovable Cloud backend:

<presentation-actions>
<presentation-open-backend>Open Backend to Export Data</presentation-open-backend>
</presentation-actions>

1. Click the button above to open the backend
2. Navigate to each table
3. Export data as CSV

---

## Step 3: Import Data

In your new Supabase project's SQL Editor, use INSERT statements or the Table Editor to import your CSV data.

**Import Order (important for foreign key constraints):**
1. colleges
2. departments
3. academic_settings
4. profiles (create users first via Supabase Auth)
5. user_roles
6. students
7. violations
8. notifications

---

## Step 4: Copy Edge Functions

Copy these edge functions from `supabase/functions/` to your new project:
- `delete-user/index.ts`
- `invite-user/index.ts`
- `reset-password/index.ts`
- `send-workflow-notification/index.ts`
- `setup-admin/index.ts`

---

## Step 5: Update Environment Variables

In your new Supabase project, you'll need to update:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Then update your `.env` file with the new values.

---

## Notes

- Users will need to be recreated in Auth (passwords cannot be migrated)
- Storage files need to be manually downloaded and re-uploaded
- Test thoroughly before going live
