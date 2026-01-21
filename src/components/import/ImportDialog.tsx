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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ImportType = 'students' | 'departments' | 'colleges';

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[][] }> = {
  students: {
    headers: ['student_id', 'full_name', 'department_code', 'program'],
    example: [
      ['ETS0123/14', 'Abebe Kebede', 'CS', 'BSc'],
      ['ETS0456/14', 'Tigist Hailu', 'EE', 'MSc'],
    ],
  },
  departments: {
    headers: ['code', 'name', 'college_code'],
    example: [
      ['CS', 'Computer Science', 'COE'],
      ['EE', 'Electrical Engineering', 'COE'],
    ],
  },
  colleges: {
    headers: ['code', 'name'],
    example: [
      ['COE', 'College of Engineering'],
      ['CNS', 'College of Natural Sciences'],
    ],
  },
};

const downloadTemplate = (type: ImportType) => {
  const template = TEMPLATES[type];
  const csvContent = [
    template.headers.join(','),
    ...template.example.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${type}_template.csv`;
  link.click();
};

const parseCSV = (text: string): string[][] => {
  const lines = text.split('\n').filter((line) => line.trim());
  return lines.map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
};

interface ImportDialogProps {
  type: ImportType;
  onSuccess?: () => void;
}

export const ImportDialog = ({ type, onSuccess }: ImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const processStudents = async (rows: string[][], headers: string[]) => {
    const studentIdIdx = headers.indexOf('student_id');
    const fullNameIdx = headers.indexOf('full_name');
    const deptCodeIdx = headers.indexOf('department_code');
    const programIdx = headers.indexOf('program');

    // Get departments for lookup
    const { data: departments } = await supabase
      .from('departments')
      .select('id, code');

    const deptMap = new Map(departments?.map((d) => [d.code.toLowerCase(), d.id]) || []);

    const students = rows.map((row) => ({
      student_id: row[studentIdIdx],
      full_name: row[fullNameIdx],
      department_id: deptMap.get(row[deptCodeIdx]?.toLowerCase()) || null,
      program: row[programIdx] as 'BSc' | 'MSc' | 'PhD',
    }));

    const { error } = await supabase.from('students').upsert(students, {
      onConflict: 'student_id',
    });

    if (error) throw error;
    return students.length;
  };

  const processDepartments = async (rows: string[][], headers: string[]) => {
    const codeIdx = headers.indexOf('code');
    const nameIdx = headers.indexOf('name');
    const collegeCodeIdx = headers.indexOf('college_code');

    // Get colleges for lookup
    const { data: colleges } = await supabase.from('colleges').select('id, code');

    const collegeMap = new Map(colleges?.map((c) => [c.code.toLowerCase(), c.id]) || []);

    const departments = rows.map((row) => ({
      code: row[codeIdx],
      name: row[nameIdx],
      college_id: collegeMap.get(row[collegeCodeIdx]?.toLowerCase()) || null,
    }));

    const { error } = await supabase.from('departments').upsert(departments, {
      onConflict: 'code',
    });

    if (error) throw error;
    return departments.length;
  };

  const processColleges = async (rows: string[][], headers: string[]) => {
    const codeIdx = headers.indexOf('code');
    const nameIdx = headers.indexOf('name');

    const colleges = rows.map((row) => ({
      code: row[codeIdx],
      name: row[nameIdx],
    }));

    const { error } = await supabase.from('colleges').upsert(colleges, {
      onConflict: 'code',
    });

    if (error) throw error;
    return colleges.length;
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const allRows = parseCSV(text);
      const headers = allRows[0].map((h) => h.toLowerCase().trim());
      const dataRows = allRows.slice(1);

      let count = 0;
      switch (type) {
        case 'students':
          count = await processStudents(dataRows, headers);
          break;
        case 'departments':
          count = await processDepartments(dataRows, headers);
          break;
        case 'colleges':
          count = await processColleges(dataRows, headers);
          break;
      }

      setImportedCount(count);
      toast.success(`Successfully imported ${count} ${type}`);
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onSuccess?.();

      setTimeout(() => {
        setOpen(false);
        setFile(null);
        setImportedCount(0);
      }, 2000);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import {typeLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import {typeLabel}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import {type}. Download the template first to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => downloadTemplate(type)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {file.name}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importedCount > 0 && (
            <Alert>
              <AlertDescription>
                Successfully imported {importedCount} records!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
