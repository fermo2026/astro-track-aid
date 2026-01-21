import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DepartmentChart } from '@/components/dashboard/DepartmentChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { ViolationTypeChart } from '@/components/dashboard/ViolationTypeChart';
import { ExamTypeChart } from '@/components/dashboard/ExamTypeChart';
import { RecentViolations } from '@/components/dashboard/RecentViolations';
import { mockStats } from '@/data/mockData';

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of student examination violations and case management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Violations"
            value={mockStats.totalViolations}
            icon={AlertTriangle}
            variant="primary"
            trend={{ value: 12, isPositive: false }}
          />
          <StatCard
            title="Pending Cases"
            value={mockStats.pendingCases}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Resolved Cases"
            value={mockStats.resolvedCases}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="This Month"
            value={mockStats.thisMonthViolations}
            icon={TrendingUp}
            trend={{ value: 8, isPositive: true }}
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
