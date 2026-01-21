import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';

interface CollegeFormProps {
  college?: {
    id: string;
    name: string;
    code: string;
  };
  onSuccess?: () => void;
}

export const CollegeForm = ({ college, onSuccess }: CollegeFormProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(college?.name || '');
  const [code, setCode] = useState(college?.code || '');
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (college) {
        const { error } = await supabase
          .from('colleges')
          .update({ name, code })
          .eq('id', college.id);

        if (error) throw error;
        toast.success('College updated successfully');
      } else {
        const { error } = await supabase
          .from('colleges')
          .insert({ name, code });

        if (error) throw error;
        toast.success('College added successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      setOpen(false);
      setName('');
      setCode('');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save college');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {college ? 'Edit' : 'Add College'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{college ? 'Edit College' : 'Add New College'}</DialogTitle>
          <DialogDescription>
            {college ? 'Update the college details.' : 'Enter the details for the new college.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">College Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., College of Engineering"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">College Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., COE"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {college ? 'Update' : 'Add'} College
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
