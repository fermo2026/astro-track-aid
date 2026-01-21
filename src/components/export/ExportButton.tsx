import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';

type ExportType = 'violations' | 'students' | 'departments' | 'colleges';

const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  const csvRows = [headers.join(',')];

  data.forEach((row) => {
    const values = headers.map((header) => {
      let value = row[header];
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csvRows.push(values.join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
};

interface ExportButtonProps {
  type?: ExportType;
  data?: any[];
  filename?: string;
  headers?: string[];
}

export const ExportButton = ({ type, data, filename, headers }: ExportButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const exportViolations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
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
          dac_decision_date,
          cmc_decision,
          cmc_decision_date,
          description,
          created_at,
          students(student_id, full_name, program, departments(name, code))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = data?.map((v: any) => ({
        student_id: v.students?.student_id,
        student_name: v.students?.full_name,
        department: v.students?.departments?.name,
        program: v.students?.program,
        incident_date: v.incident_date,
        course_name: v.course_name,
        course_code: v.course_code,
        exam_type: v.exam_type,
        violation_type: v.violation_type,
        invigilator: v.invigilator,
        dac_decision: v.dac_decision,
        dac_decision_date: v.dac_decision_date,
        cmc_decision: v.cmc_decision,
        cmc_decision_date: v.cmc_decision_date,
        description: v.description,
        created_at: v.created_at,
      }));

      const csvHeaders = [
        'student_id',
        'student_name',
        'department',
        'program',
        'incident_date',
        'course_name',
        'course_code',
        'exam_type',
        'violation_type',
        'invigilator',
        'dac_decision',
        'dac_decision_date',
        'cmc_decision',
        'cmc_decision_date',
        'description',
        'created_at',
      ];

      exportToCSV(exportData || [], 'violations_report', csvHeaders);
      toast.success('Violations report exported successfully');
    } catch (err: any) {
      toast.error('Failed to export violations');
    } finally {
      setIsLoading(false);
    }
  };

  const exportStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('student_id, full_name, program, departments(name, code)')
        .order('full_name');

      if (error) throw error;

      const exportData = data?.map((s: any) => ({
        student_id: s.student_id,
        full_name: s.full_name,
        department: s.departments?.name,
        department_code: s.departments?.code,
        program: s.program,
      }));

      exportToCSV(exportData || [], 'students', [
        'student_id',
        'full_name',
        'department',
        'department_code',
        'program',
      ]);
      toast.success('Students exported successfully');
    } catch (err: any) {
      toast.error('Failed to export students');
    } finally {
      setIsLoading(false);
    }
  };

  const exportDepartments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('code, name, colleges(name, code)')
        .order('name');

      if (error) throw error;

      const exportData = data?.map((d: any) => ({
        code: d.code,
        name: d.name,
        college: d.colleges?.name,
        college_code: d.colleges?.code,
      }));

      exportToCSV(exportData || [], 'departments', ['code', 'name', 'college', 'college_code']);
      toast.success('Departments exported successfully');
    } catch (err: any) {
      toast.error('Failed to export departments');
    } finally {
      setIsLoading(false);
    }
  };

  const exportColleges = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('code, name')
        .order('name');

      if (error) throw error;

      exportToCSV(data || [], 'colleges', ['code', 'name']);
      toast.success('Colleges exported successfully');
    } catch (err: any) {
      toast.error('Failed to export colleges');
    } finally {
      setIsLoading(false);
    }
  };

  // If custom data is provided, use that
  if (data && filename && headers) {
    return (
      <Button
        variant="outline"
        onClick={() => exportToCSV(data, filename, headers)}
        disabled={isLoading}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    );
  }

  // Otherwise show dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportViolations}>
          <FileText className="h-4 w-4 mr-2" />
          Violations Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportStudents}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Students
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportDepartments}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Departments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportColleges}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Colleges
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
