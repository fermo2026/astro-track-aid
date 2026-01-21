import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, UserCheck, Users, Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InviteUserForm } from '@/components/users/InviteUserForm';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const roles = [
  { 
    name: 'System Admin', 
    value: 'system_admin',
    description: 'Full system access - Can manage all users and settings', 
    level: 0,
    permissions: ['Manage users', 'Full access', 'System settings']
  },
  { 
    name: 'VPAA', 
    value: 'vpaa',
    description: 'Vice President for Academic Affairs - Highest authority', 
    level: 1,
    permissions: ['View all', 'Approve all', 'Final decision']
  },
  { 
    name: 'Main Registrar', 
    value: 'main_registrar',
    description: 'Central registration office head', 
    level: 2,
    permissions: ['View all', 'Approve escalations', 'Generate reports']
  },
  { 
    name: 'College Registrar', 
    value: 'college_registrar',
    description: 'College-level registration officer', 
    level: 3,
    permissions: ['View college cases', 'Process records', 'Escalate to Main Registrar']
  },
  { 
    name: 'College Dean', 
    value: 'college_dean',
    description: 'Head of the college', 
    level: 4,
    permissions: ['View college cases', 'Approve CMC decisions', 'Escalate to VPAA']
  },
  { 
    name: 'Academic Vice Dean', 
    value: 'academic_vice_dean',
    description: 'Deputy to College Dean for academic affairs', 
    level: 5,
    permissions: ['View college cases', 'Review CMC decisions', 'Recommend to Dean']
  },
  { 
    name: 'Department Head', 
    value: 'department_head',
    description: 'Head of academic department', 
    level: 6,
    permissions: ['View dept cases', 'Make DAC decisions', 'Escalate to Dean']
  },
  { 
    name: 'Deputy Department Head', 
    value: 'deputy_department_head',
    description: 'Assistant to Department Head', 
    level: 7,
    permissions: ['View dept cases', 'Create records', 'Submit to DAC']
  },
];

const getRoleLabel = (role: string) => {
  const roleItem = roles.find(r => r.value === role);
  return roleItem?.name || role;
};

const UsersRoles = () => {
  const { isSystemAdmin, user } = useAuth();
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          must_change_password,
          invited_at,
          department_id
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, department_id');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      return profilesData?.map(profile => ({
        ...profile,
        roles: rolesData?.filter(r => r.user_id === profile.id) || [],
      })) || [];
    },
    enabled: isSystemAdmin,
  });

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-muted-foreground mt-1">
              Role-based access control and user management
            </p>
          </div>
          {isSystemAdmin && <InviteUserForm onSuccess={() => refetch()} />}
        </div>

        {/* Users List - Only for System Admin */}
        {isSystemAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                System Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : users && users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role(s)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((usr) => (
                      <TableRow key={usr.id}>
                        <TableCell className="font-medium">
                          {usr.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{usr.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {usr.roles.map((r: any, idx: number) => (
                              <Badge key={idx} variant="secondary">
                                {getRoleLabel(r.role)}
                              </Badge>
                            ))}
                            {usr.roles.length === 0 && (
                              <span className="text-muted-foreground text-sm">No role</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {usr.must_change_password ? (
                            <Badge variant="outline" className="text-warning border-warning">
                              Pending Password Change
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(usr)}
                            className="gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No users found. Use the "Invite User" button to add users.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {editingUser && (
          <UserEditDialog
            user={editingUser}
            open={!!editingUser}
            onOpenChange={(open) => !open && setEditingUser(null)}
            onSuccess={() => refetch()}
            currentUserId={user?.id || ''}
          />
        )}

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
                  key={role.value}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  style={{ marginLeft: `${index * 16}px` }}
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

        {!isSystemAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex items-center justify-center py-12">
              <CardContent className="text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">User Management</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Only system administrators can manage users
                </p>
              </CardContent>
            </Card>

            <Card className="flex items-center justify-center py-12">
              <CardContent className="text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Access Control</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Contact your administrator for role changes
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UsersRoles;
