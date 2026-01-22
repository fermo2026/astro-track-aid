import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface ReportFilters {
  dateFrom: Date | null;
  dateTo: Date | null;
  departmentId: string;
  violationType: string;
  examType: string;
  status: string;
  program: string;
}

export interface ViolationReportData {
  id: string;
  incident_date: string;
  course_name: string;
  course_code: string;
  exam_type: string;
  violation_type: string;
  invigilator: string;
  dac_decision: string;
  cmc_decision: string;
  workflow_status: string;
  is_repeat_offender: boolean;
  created_at: string;
  students: {
    id: string;
    student_id: string;
    full_name: string;
    program: string;
    departments: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
}

export const useReportData = (filters: ReportFilters) => {
  return useQuery({
    queryKey: ['report-data', filters],
    queryFn: async (): Promise<ViolationReportData[]> => {
      let query = supabase
        .from('violations')
        .select(`
          id,
          incident_date,
          course_name,
          course_code,
          exam_type,
          violation_type,
          invigilator,
          dac_decision,
          cmc_decision,
          workflow_status,
          is_repeat_offender,
          created_at,
          students(id, student_id, full_name, program, departments(id, name, code))
        `)
        .order('incident_date', { ascending: false });

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('incident_date', format(filters.dateFrom, 'yyyy-MM-dd'));
      }
      if (filters.dateTo) {
        query = query.lte('incident_date', format(filters.dateTo, 'yyyy-MM-dd'));
      }

      // Apply violation type filter
      if (filters.violationType && filters.violationType !== 'all') {
        query = query.eq('violation_type', filters.violationType as any);
      }

      // Apply exam type filter
      if (filters.examType && filters.examType !== 'all') {
        query = query.eq('exam_type', filters.examType as any);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'pending') {
          query = query.or('dac_decision.eq.Pending,cmc_decision.eq.Pending');
        } else if (filters.status === 'resolved') {
          query = query.neq('dac_decision', 'Pending').neq('cmc_decision', 'Pending');
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply client-side filters for department and program
      let filteredData = data || [];

      if (filters.departmentId && filters.departmentId !== 'all') {
        filteredData = filteredData.filter(
          (v: any) => v.students?.departments?.id === filters.departmentId
        );
      }

      if (filters.program && filters.program !== 'all') {
        filteredData = filteredData.filter(
          (v: any) => v.students?.program === filters.program
        );
      }

      return filteredData;
    },
  });
};

export interface ReportSummary {
  totalViolations: number;
  byDepartment: { department: string; count: number }[];
  byViolationType: { type: string; count: number }[];
  byExamType: { name: string; value: number }[];
  byMonth: { month: string; violations: number }[];
  byStatus: { status: string; count: number }[];
  repeatOffenders: number;
}

export const useReportSummary = (data: ViolationReportData[] | undefined): ReportSummary => {
  if (!data || data.length === 0) {
    return {
      totalViolations: 0,
      byDepartment: [],
      byViolationType: [],
      byExamType: [],
      byMonth: [],
      byStatus: [],
      repeatOffenders: 0,
    };
  }

  // By Department
  const deptMap = new Map<string, number>();
  data.forEach((v) => {
    const dept = v.students?.departments?.name || 'Unknown';
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
  });
  const byDepartment = Array.from(deptMap.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // By Violation Type
  const typeMap = new Map<string, number>();
  data.forEach((v) => {
    typeMap.set(v.violation_type, (typeMap.get(v.violation_type) || 0) + 1);
  });
  const byViolationType = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // By Exam Type
  const examMap = new Map<string, number>();
  data.forEach((v) => {
    examMap.set(v.exam_type, (examMap.get(v.exam_type) || 0) + 1);
  });
  const byExamType = Array.from(examMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // By Month
  const monthMap = new Map<string, number>();
  data.forEach((v) => {
    const month = format(new Date(v.incident_date), 'MMM yyyy');
    monthMap.set(month, (monthMap.get(month) || 0) + 1);
  });
  const byMonth = Array.from(monthMap.entries())
    .map(([month, violations]) => ({ month, violations }))
    .reverse();

  // By Status
  const pendingCount = data.filter(
    (v) => v.dac_decision === 'Pending' || v.cmc_decision === 'Pending'
  ).length;
  const resolvedCount = data.filter(
    (v) => v.dac_decision !== 'Pending' && v.cmc_decision !== 'Pending'
  ).length;
  const byStatus = [
    { status: 'Pending', count: pendingCount },
    { status: 'Resolved', count: resolvedCount },
  ];

  // Repeat Offenders
  const repeatOffenders = data.filter((v) => v.is_repeat_offender).length;

  return {
    totalViolations: data.length,
    byDepartment,
    byViolationType,
    byExamType,
    byMonth,
    byStatus,
    repeatOffenders,
  };
};
