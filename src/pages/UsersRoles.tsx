import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck, Users } from 'lucide-react';

const roles = [
  { 
    name: 'VPAA', 
    description: 'Vice President for Academic Affairs - Highest authority', 
    level: 1,
    permissions: ['View all', 'Approve all', 'Final decision']
  },
  { 
    name: 'Main Registrar', 
    description: 'Central registration office head', 
    level: 2,
    permissions: ['View all', 'Approve escalations', 'Generate reports']
  },
  { 
    name: 'College Registrar', 
    description: 'College-level registration officer', 
    level: 3,
    permissions: ['View college cases', 'Process records', 'Escalate to Main Registrar']
  },
  { 
    name: 'College Dean', 
    description: 'Head of the college', 
    level: 4,
    permissions: ['View college cases', 'Approve CMC decisions', 'Escalate to VPAA']
  },
  { 
    name: 'Academic Vice Dean', 
    description: 'Deputy to College Dean for academic affairs', 
    level: 5,
    permissions: ['View college cases', 'Review CMC decisions', 'Recommend to Dean']
  },
  { 
    name: 'Department Head', 
    description: 'Head of academic department', 
    level: 6,
    permissions: ['View dept cases', 'Make DAC decisions', 'Escalate to Dean']
  },
  { 
    name: 'Deputy Department Head', 
    description: 'Assistant to Department Head', 
    level: 7,
    permissions: ['View dept cases', 'Create records', 'Submit to DAC']
  },
];

const UsersRoles = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users & Roles</h1>
          <p className="text-muted-foreground mt-1">
            Role-based access control and user management
          </p>
        </div>

        {/* Role Hierarchy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Role Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roles.map((role, index) => (
                <div 
                  key={role.name}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  style={{ marginLeft: `${index * 20}px` }}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                    {role.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{role.name}</h3>
                      <Badge variant="outline" className="text-xs">Level {role.level}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {role.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex items-center justify-center py-12">
            <CardContent className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">User Management</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Enable Lovable Cloud to manage users and authentication
              </p>
            </CardContent>
          </Card>

          <Card className="flex items-center justify-center py-12">
            <CardContent className="text-center">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">Access Control</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Configure role-based permissions and access rules
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default UsersRoles;
