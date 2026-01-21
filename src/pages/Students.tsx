import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

const Students = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">
            View all students with violation records
          </p>
        </div>

        <Card className="flex items-center justify-center py-20">
          <CardContent className="text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Student Directory</h3>
            <p className="text-muted-foreground mt-2">
              This section will display a comprehensive list of students with violation history.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Students;
