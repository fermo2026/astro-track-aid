import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExamTypes } from '@/hooks/useDashboardStats';
import { Loader2 } from 'lucide-react';

const COLORS = ['hsl(45, 85%, 55%)', 'hsl(215, 80%, 35%)'];

export const ExamTypeChart = () => {
  const { data: examTypeData, isLoading } = useExamTypes();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">By Exam Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : examTypeData && examTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={examTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {examTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '14px' }}
                  formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No exam type data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
