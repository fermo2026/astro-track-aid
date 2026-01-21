import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const Departments = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground mt-1">
            Department-wise violation statistics and management
          </p>
        </div>

        <Card className="flex items-center justify-center py-20">
          <CardContent className="text-center">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Department Overview</h3>
            <p className="text-muted-foreground mt-2">
              This section will display department-wise violation statistics and reports.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Departments;
