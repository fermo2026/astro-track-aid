-- Fix the overly permissive INSERT policy
-- Drop the old policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create a more restrictive policy - only authenticated system can insert
-- The edge function uses service_role key which bypasses RLS anyway
-- This policy prevents anonymous inserts while allowing authenticated service operations
CREATE POLICY "Authenticated users cannot directly insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);