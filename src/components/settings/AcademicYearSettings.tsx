import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

export const AcademicYearSettings = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newSemester, setNewSemester] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: academicSettings, isLoading } = useQuery({
    queryKey: ['academic-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_settings')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('semester');
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async () => {
    if (!newYear || !newSemester) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('academic_settings').insert({
        academic_year: newYear,
        semester: newSemester,
        is_active: false,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('This academic year and semester combination already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Academic period added successfully');
      queryClient.invalidateQueries({ queryKey: ['academic-settings'] });
      setNewYear('');
      setNewSemester('');
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add academic period');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      if (!currentlyActive) {
        // Deactivate all others first
        await supabase
          .from('academic_settings')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('academic_settings')
        .update({ is_active: !currentlyActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentlyActive ? 'Academic period deactivated' : 'Academic period activated');
      queryClient.invalidateQueries({ queryKey: ['academic-settings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('academic_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Academic period deleted');
      queryClient.invalidateQueries({ queryKey: ['academic-settings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - 5 + i;
    return `${year}/${year + 1}`;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Academic Year & Semester
            </CardTitle>
            <CardDescription>
              Set the active academic year and semester. Only the active period will be available for users when recording violations.
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={newSemester} onValueChange={setNewSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleAdd} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : academicSettings && academicSettings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academic Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-16">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academicSettings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-medium">{setting.academic_year}</TableCell>
                  <TableCell>
                    {setting.semester === 'Summer' ? 'Summer' : `Semester ${setting.semester}`}
                  </TableCell>
                  <TableCell>
                    {setting.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={setting.is_active}
                      onCheckedChange={() => handleToggleActive(setting.id, setting.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={setting.is_active}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Academic Period</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {setting.academic_year} - Semester {setting.semester}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(setting.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No academic periods configured. Add one to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
