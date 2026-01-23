-- Add college_id to profiles table for college-level users (AVD, Dean, etc.)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id);

-- Add college_id to user_roles table for college-level users
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id);