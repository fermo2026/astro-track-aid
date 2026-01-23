import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const ROLES = [
  { value: 'deputy_department_head', label: 'Deputy Department Head' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'academic_vice_dean', label: 'Academic Vice Dean' },
  { value: 'college_dean', label: 'College Dean' },
  { value: 'college_registrar', label: 'College Registrar' },
  { value: 'main_registrar', label: 'Main Registrar' },
  { value: 'vpaa', label: 'VPAA' },
  { value: 'system_admin', label: 'System Administrator' },
];

interface InviteUserFormProps {
  onSuccess?: () => void;
}

export const InviteUserForm = ({ onSuccess }: InviteUserFormProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

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

  const { data: colleges } = useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          full_name: fullName,
          role,
          department_id: needsDepartment ? (departmentId || null) : null,
          college_id: needsCollege ? (collegeId || null) : null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setSuccess(`User ${email} has been invited successfully with default password.`);
      toast.success('User invited successfully');
      
      // Reset form
      setEmail('');
      setFullName('');
      setRole('');
      setDepartmentId('');
      setCollegeId('');
      
      onSuccess?.();
      
      // Close dialog after a delay
      setTimeout(() => {
        setOpen(false);
        setSuccess('');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to invite user');
      toast.error('Failed to invite user');
    } finally {
      setIsLoading(false);
    }
  };

  // Department-level roles need department
  const needsDepartment = ['deputy_department_head', 'department_head'].includes(role);
  // College-level roles need college (AVD, Dean, Registrar)
  const needsCollege = ['academic_vice_dean', 'college_dean', 'college_registrar'].includes(role);
  // Management roles: main_registrar, vpaa, system_admin - no department/college needed

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Create a new user account. They will receive an email with their credentials and must change their password on first login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-500 text-green-700 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole} required disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsDepartment && (
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={departmentId} onValueChange={setDepartmentId} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsCollege && (
              <div className="space-y-2">
                <Label htmlFor="college">College *</Label>
                <Select value={collegeId} onValueChange={setCollegeId} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a college" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges?.map((college) => (
                      <SelectItem key={college.id} value={college.id}>
                        {college.name} ({college.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This role has access to all departments within the selected college.
                </p>
              </div>
            )}

            <Alert className="bg-muted">
              <AlertDescription className="text-sm">
                The user will be created with the default password: <strong>12345678</strong>
                <br />
                They must change it upon first login.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !role}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                'Invite User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
