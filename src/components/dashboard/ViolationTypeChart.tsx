import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useViolationTypes } from '@/hooks/useDashboardStats';
import { Loader2 } from 'lucide-react';

const COLORS = ['hsl(215, 80%, 35%)', 'hsl(45, 85%, 55%)', 'hsl(142, 71%, 45%)', 'hsl(199, 89%, 48%)', 'hsl(0, 72%, 51%)', 'hsl(280, 65%, 60%)'];

export const ViolationTypeChart = () => {
  const { data: violationTypeData, isLoading } = useViolationTypes();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Violation Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : violationTypeData && violationTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={violationTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="type"
                >
                  {violationTypeData.map((_, index) => (
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
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No violation data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
