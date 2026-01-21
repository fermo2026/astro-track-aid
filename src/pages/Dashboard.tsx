import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DepartmentChart } from '@/components/dashboard/DepartmentChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { ViolationTypeChart } from '@/components/dashboard/ViolationTypeChart';
import { ExamTypeChart } from '@/components/dashboard/ExamTypeChart';
import { RecentViolations } from '@/components/dashboard/RecentViolations';
import { ExportButton } from '@/components/export/ExportButton';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of student examination violations and case management
            </p>
          </div>
          <ExportButton />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Violations"
            value={isLoading ? '...' : stats?.totalViolations ?? 0}
            icon={AlertTriangle}
            variant="primary"
          />
          <StatCard
            title="Pending Cases"
            value={isLoading ? '...' : stats?.pendingCases ?? 0}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Resolved Cases"
            value={isLoading ? '...' : stats?.resolvedCases ?? 0}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="This Month"
            value={isLoading ? '...' : stats?.thisMonthViolations ?? 0}
            icon={TrendingUp}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <DepartmentChart />
          <TrendChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ViolationTypeChart />
          <ExamTypeChart />
        </div>

        {/* Recent Violations */}
        <RecentViolations />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
