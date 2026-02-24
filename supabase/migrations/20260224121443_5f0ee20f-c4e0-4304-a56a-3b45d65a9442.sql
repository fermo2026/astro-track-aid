-- Allow system admins to delete violations
CREATE POLICY "System admin can delete violations"
ON public.violations
FOR DELETE
USING (has_role(auth.uid(), 'system_admin'::app_role));