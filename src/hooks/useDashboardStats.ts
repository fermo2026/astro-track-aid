import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface DashboardStats {
  totalViolations: number;
  pendingCases: number;
  resolvedCases: number;
  thisMonthViolations: number;
}

export interface DepartmentViolation {
  department: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  violations: number;
}

export interface ViolationTypeData {
  type: string;
  count: number;
}

export interface ExamTypeData {
  name: string;
  value: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const endOfThisMonth = endOfMonth(now);

      // Get total violations
      const { count: totalViolations } = await supabase
        .from('violations')
        .select('*', { count: 'exact', head: true });

      // Get pending cases (DAC or CMC decision is Pending)
      const { count: pendingCases } = await supabase
        .from('violations')
        .select('*', { count: 'exact', head: true })
        .or('dac_decision.eq.Pending,cmc_decision.eq.Pending');

      // Get resolved cases (both decisions are not Pending)
      const { count: resolvedCases } = await supabase
        .from('violations')
        .select('*', { count: 'exact', head: true })
        .neq('dac_decision', 'Pending')
        .neq('cmc_decision', 'Pending');

      // Get this month's violations
      const { count: thisMonthViolations } = await supabase
        .from('violations')
        .select('*', { count: 'exact', head: true })
        .gte('incident_date', format(startOfThisMonth, 'yyyy-MM-dd'))
        .lte('incident_date', format(endOfThisMonth, 'yyyy-MM-dd'));

      return {
        totalViolations: totalViolations || 0,
        pendingCases: pendingCases || 0,
        resolvedCases: resolvedCases || 0,
        thisMonthViolations: thisMonthViolations || 0,
      };
    },
  });
};

export const useDepartmentViolations = () => {
  return useQuery({
    queryKey: ['department-violations'],
    queryFn: async (): Promise<DepartmentViolation[]> => {
      const { data: violations, error } = await supabase
        .from('violations')
        .select('student_id, students(department_id, departments(name))');

      if (error) throw error;

      // Count violations by department
      const deptCounts: Record<string, number> = {};
      violations?.forEach((v: any) => {
        const deptName = v.students?.departments?.name || 'Unknown';
        deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
      });

      return Object.entries(deptCounts)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);
    },
  });
};

export const useMonthlyTrend = () => {
  return useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      const months: MonthlyTrend[] = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

        const { count } = await supabase
          .from('violations')
          .select('*', { count: 'exact', head: true })
          .gte('incident_date', start)
          .lte('incident_date', end);

        months.push({
          month: format(monthDate, 'MMM'),
          violations: count || 0,
        });
      }

      return months;
    },
  });
};

export const useViolationTypes = () => {
  return useQuery({
    queryKey: ['violation-types'],
    queryFn: async (): Promise<ViolationTypeData[]> => {
      const { data, error } = await supabase
        .from('violations')
        .select('violation_type');

      if (error) throw error;

      const typeCounts: Record<string, number> = {};
      data?.forEach((v) => {
        const type = v.violation_type || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      return Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
};

export const useExamTypes = () => {
  return useQuery({
    queryKey: ['exam-types'],
    queryFn: async (): Promise<ExamTypeData[]> => {
      const { data, error } = await supabase
        .from('violations')
        .select('exam_type');

      if (error) throw error;

      const typeCounts: Record<string, number> = {};
      data?.forEach((v) => {
        const type = v.exam_type || 'Unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    },
  });
};

export const useRecentViolations = () => {
  return useQuery({
    queryKey: ['recent-violations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violations')
        .select(`
          id,
          incident_date,
          violation_type,
          dac_decision,
          students(full_name, student_id, departments(name))
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });
};
