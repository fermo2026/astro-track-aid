import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAcademicSettings = () => {
  const { data: activeAcademicPeriod, isLoading } = useQuery({
    queryKey: ['active-academic-period'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_settings')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
  });

  const { data: allAcademicPeriods } = useQuery({
    queryKey: ['all-academic-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_settings')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('semester');
      if (error) throw error;
      return data;
    },
  });

  return {
    activeAcademicPeriod,
    allAcademicPeriods,
    isLoading,
    hasActiveAcademicPeriod: !!activeAcademicPeriod,
  };
};
