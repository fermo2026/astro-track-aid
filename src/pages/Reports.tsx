import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportCharts } from '@/components/reports/ReportCharts';
import { ExportButton } from '@/components/export/ExportButton';
import { useReportData, useReportSummary, ReportFilters as ReportFiltersType } from '@/hooks/useReportData';
import { supabase } from '@/integrations/supabase/client';
import { FileText, BarChart3, Table } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { format } from 'date-fns';

const defaultFilters: ReportFiltersType = {
  dateFrom: null,
  dateTo: null,
  departmentId: 'all',
  violationType: 'all',
  examType: 'all',
  status: 'all',
  program: 'all',
};

const Reports = () => {
  const [filters, setFilters] = useState<ReportFiltersType>(defaultFilters);
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: reportData, isLoading } = useReportData(filters);
  const summary = useReportSummary(reportData);

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  // Prepare export data
  const exportData = reportData?.map((v) => ({
    student_id: v.students?.student_id || '',
    student_name: v.students?.full_name || '',
    department: v.students?.departments?.name || '',
    program: v.students?.program || '',
    incident_date: v.incident_date,
    course_name: v.course_name,
    course_code: v.course_code,
    exam_type: v.exam_type,
    violation_type: v.violation_type,
    invigilator: v.invigilator,
    dac_decision: v.dac_decision,
    cmc_decision: v.cmc_decision,
    workflow_status: v.workflow_status,
    is_repeat_offender: v.is_repeat_offender ? 'Yes' : 'No',
    created_at: v.created_at,
  }));

  const exportHeaders = [
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
    'cmc_decision',
    'workflow_status',
    'is_repeat_offender',
    'created_at',
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Generate and analyze violation reports with custom filters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              data={exportData}
              filename={`violations_report_${format(new Date(), 'yyyy-MM-dd')}`}
              headers={exportHeaders}
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <ReportFilters
              filters={filters}
              onFiltersChange={setFilters}
              departments={departments}
              onReset={handleReset}
            />
          </CardContent>
        </Card>

        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'charts')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Charts View
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="mt-6">
              <TableSkeleton columns={10} rows={6} columnWidths={['w-28', 'w-20', 'w-16', 'w-20', 'w-24', 'w-16', 'w-20', 'w-20', 'w-20', 'w-16']} />
            </div>
          ) : (
            <>
              <TabsContent value="table" className="mt-6">
                <ReportTable data={reportData || []} />
              </TabsContent>

              <TabsContent value="charts" className="mt-6">
                <ReportCharts summary={summary} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
