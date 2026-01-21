-- Add must_change_password field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Add invited_by field to track who invited the user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_by uuid;

-- Add invited_at field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_at timestamp with time zone;

-- Update RLS policy for profiles to allow system_admin to view all profiles
CREATE POLICY "System admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- Allow system_admin to update any profile (for admin purposes)
CREATE POLICY "System admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- Allow system_admin to manage all user_roles
CREATE POLICY "System admin can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- Allow system_admin to view all roles
CREATE POLICY "System admin can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system_admin'::app_role));