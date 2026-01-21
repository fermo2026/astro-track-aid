import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Trash2, KeyRound } from 'lucide-react';

const roles = [
  { name: 'System Admin', value: 'system_admin' },
  { name: 'VPAA', value: 'vpaa' },
  { name: 'Main Registrar', value: 'main_registrar' },
  { name: 'College Registrar', value: 'college_registrar' },
  { name: 'College Dean', value: 'college_dean' },
  { name: 'Academic Vice Dean', value: 'academic_vice_dean' },
  { name: 'Department Head', value: 'department_head' },
  { name: 'Deputy Department Head', value: 'deputy_department_head' },
];

interface UserEditDialogProps {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    department_id: string | null;
    roles: { role: string; department_id: string | null }[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserId: string;
}

export const UserEditDialog = ({ user, open, onOpenChange, onSuccess, currentUserId }: UserEditDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [selectedRole, setSelectedRole] = useState(user.roles[0]?.role || '');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(user.roles[0]?.department_id || '');
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setFullName(user.full_name || '');
    setSelectedRole(user.roles[0]?.role || '');
    setSelectedDepartment(user.roles[0]?.department_id || '');
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update role - delete existing and insert new
      const { error: deleteRoleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteRoleError) throw deleteRoleError;

      if (selectedRole) {
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: user.id,
            role: selectedRole as any,
            department_id: selectedDepartment || null,
          }]);

        if (insertRoleError) throw insertRoleError;
      }

      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (user.id === currentUserId) {
      toast.error('You cannot delete your own account');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (user.id === currentUserId) {
      toast.error('You cannot reset your own password here. Use the profile settings.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.functions.invoke('reset-password', {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast.success('Password reset to default (12345678). User will be required to change it on next login.');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isCurrentUser = user.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and role assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Department (optional)</Label>
            <Select value={selectedDepartment || '__none__'} onValueChange={(val) => setSelectedDepartment(val === '__none__' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No department</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password Reset Section */}
          {!isCurrentUser && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Password Reset</Label>
                  <p className="text-xs text-muted-foreground">Reset password to default (12345678)</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      disabled={isResettingPassword}
                      className="gap-2"
                    >
                      <KeyRound className="h-4 w-4" />
                      Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Password</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset {user.full_name || user.email}'s password to the default (12345678). 
                        The user will be required to change their password on next login.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetPassword}>
                        {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Reset Password
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                type="button" 
                variant="destructive" 
                disabled={isCurrentUser || isDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {user.full_name || user.email}? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
