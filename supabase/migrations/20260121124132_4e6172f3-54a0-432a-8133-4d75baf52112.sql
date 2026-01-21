-- Allow academic vice dean to delete departments
CREATE POLICY "Academic vice dean can delete departments"
ON public.departments FOR DELETE
USING (has_role(auth.uid(), 'academic_vice_dean'::app_role));