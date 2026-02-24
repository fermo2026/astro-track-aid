import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Upload, Loader2, Download, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, ArrowLeft, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

type ImportType = 'students' | 'departments' | 'colleges';

interface ValidationResult {
  row: number;
  data: Record<string, string>;
  status: 'valid' | 'duplicate' | 'error' | 'warning';
  message?: string;
}

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
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const queryClient = useQueryClient();
  const { roles, isSystemAdmin } = useAuth();

  // Check if user is AVD
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  const avdCollegeId = roles.find(r => r.role === 'academic_vice_dean')?.college_id;
  // AVD no longer selects a department manually — department_code from CSV is used

  // Fetch existing data for duplicate detection
  const { data: existingStudents } = useQuery({
    queryKey: ['existing-students-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('student_id');
      if (error) throw error;
      return new Set(data.map(s => s.student_id.toLowerCase()));
    },
    enabled: type === 'students' && open,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-for-import', avdCollegeId, isAVD],
    queryFn: async () => {
      let query = supabase.from('departments').select('id, code, name');
      
      // AVD can only import to departments in their college
      if (isAVD && avdCollegeId) {
        query = query.eq('college_id', avdCollegeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: type === 'students' && open,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setValidationResults([]);
      setStep('upload');
    }
  };

  const validateStudents = async (rows: string[][], headers: string[]): Promise<ValidationResult[]> => {
    const studentIdIdx = headers.indexOf('student_id');
    const fullNameIdx = headers.indexOf('full_name');
    const deptCodeIdx = headers.indexOf('department_code');
    const programIdx = headers.indexOf('program');

    const deptMap = new Map(departments?.map((d) => [d.code.toLowerCase(), d.id]) || []);
    const validPrograms = ['BSc', 'MSc', 'PhD'];
    const seenIds = new Set<string>();
    const results: ValidationResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const studentId = row[studentIdIdx]?.trim();
      const fullName = row[fullNameIdx]?.trim();
      const deptCode = row[deptCodeIdx]?.trim();
      const program = row[programIdx]?.trim();

      const data = { student_id: studentId, full_name: fullName, department_code: deptCode, program };

      // Check required fields
      if (!studentId || !fullName) {
        results.push({
          row: i + 2,
          data,
          status: 'error',
          message: 'Student ID and Full Name are required',
        });
        continue;
      }

      // Check for duplicates within file
      if (seenIds.has(studentId.toLowerCase())) {
        results.push({
          row: i + 2,
          data,
          status: 'error',
          message: 'Duplicate student ID in file',
        });
        continue;
      }
      seenIds.add(studentId.toLowerCase());

      // Check for existing in database
      if (existingStudents?.has(studentId.toLowerCase())) {
        results.push({
          row: i + 2,
          data,
          status: 'duplicate',
          message: 'Student already exists (will be updated)',
        });
        continue;
      }

      // Check department code exists
      if (deptCode && !deptMap.has(deptCode.toLowerCase())) {
        results.push({
          row: i + 2,
          data,
          status: 'warning',
          message: `Department "${deptCode}" not found`,
        });
        continue;
      }

      // AVD: department_code is required so students are organized under correct department
      if (isAVD && !deptCode) {
        results.push({
          row: i + 2,
          data,
          status: 'error',
          message: 'Department code is required for AVD imports',
        });
        continue;
      }

      // Check program
      if (program && !validPrograms.includes(program)) {
        results.push({
          row: i + 2,
          data,
          status: 'warning',
          message: `Invalid program "${program}". Use BSc, MSc, or PhD`,
        });
        continue;
      }

      results.push({
        row: i + 2,
        data,
        status: 'valid',
      });
    }

    return results;
  };

  const handleValidate = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    // No department selection needed for AVD — detected from CSV

    setIsValidating(true);
    setError(null);

    try {
      const text = await file.text();
      const allRows = parseCSV(text);
      const headers = allRows[0].map((h) => h.toLowerCase().trim());
      const dataRows = allRows.slice(1);

      setParsedHeaders(headers);

      // Check required headers
      const requiredHeaders = TEMPLATES[type].headers;
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setError(`Missing required columns: ${missingHeaders.join(', ')}`);
        setIsValidating(false);
        return;
      }

      let results: ValidationResult[] = [];
      if (type === 'students') {
        results = await validateStudents(dataRows, headers);
      } else {
        // For departments/colleges, simple validation
        results = dataRows.map((row, i) => ({
          row: i + 2,
          data: Object.fromEntries(headers.map((h, idx) => [h, row[idx] || ''])),
          status: 'valid' as const,
        }));
      }

      setValidationResults(results);
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to validate file');
    } finally {
      setIsValidating(false);
    }
  };

  const processStudents = async (rows: string[][], headers: string[]) => {
    const studentIdIdx = headers.indexOf('student_id');
    const fullNameIdx = headers.indexOf('full_name');
    const deptCodeIdx = headers.indexOf('department_code');
    const programIdx = headers.indexOf('program');

    const deptMap = new Map(departments?.map((d) => [d.code.toLowerCase(), d.id]) || []);

    // Only process valid and duplicate (update) rows
    const validRows = validationResults
      .filter(r => r.status === 'valid' || r.status === 'duplicate')
      .map(r => r.row - 2);

    const students = validRows.map((rowIdx) => {
      const row = rows[rowIdx];
      
      // Always use department_code from CSV to resolve department
      const departmentId = deptMap.get(row[deptCodeIdx]?.toLowerCase().trim()) || null;
      
      return {
        student_id: row[studentIdIdx]?.trim(),
        full_name: row[fullNameIdx]?.trim(),
        department_id: departmentId,
        program: (row[programIdx]?.trim() || 'BSc') as 'BSc' | 'MSc' | 'PhD',
      };
    });

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

    const { data: colleges } = await supabase.from('colleges').select('id, code');
    const collegeMap = new Map(colleges?.map((c) => [c.code.toLowerCase(), c.id]) || []);

    const depts = rows.map((row) => ({
      code: row[codeIdx],
      name: row[nameIdx],
      college_id: collegeMap.get(row[collegeCodeIdx]?.toLowerCase()) || null,
    }));

    const { error } = await supabase.from('departments').upsert(depts, {
      onConflict: 'code',
    });

    if (error) throw error;
    return depts.length;
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
    if (!file) return;

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

      toast.success(`Successfully imported ${count} ${type}`);
      queryClient.invalidateQueries({ queryKey: [type] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['existing-students-for-import'] });
      onSuccess?.();

      setTimeout(() => {
        resetDialog();
      }, 1000);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setOpen(false);
    setFile(null);
    setStep('upload');
    setValidationResults([]);
    setError(null);
    setSelectedDepartmentId('');
  };

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  
  const validCount = validationResults.filter(r => r.status === 'valid').length;
  const duplicateCount = validationResults.filter(r => r.status === 'duplicate').length;
  const warningCount = validationResults.filter(r => r.status === 'warning').length;
  const errorCount = validationResults.filter(r => r.status === 'error').length;
  const canImport = (validCount + duplicateCount) > 0 && errorCount === 0;

  // AVD no longer needs a department selector — auto-detected from CSV
  const showDepartmentSelector = false;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetDialog(); else setOpen(o); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import {typeLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className={step === 'review' ? 'max-w-4xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? `Import ${typeLabel}` : `Review Import - ${typeLabel}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' 
              ? `Upload a CSV file to import ${type}. Download the template first to see the required format.`
              : 'Review the validation results before importing.'}
            {type === 'students' && isAVD && step === 'upload' && (
              <span className="block mt-1 text-primary font-medium">
                Departments will be automatically detected from the department_code column in your CSV.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="space-y-4">
            {/* AVD Department Selector */}
            {showDepartmentSelector && (
              <div className="space-y-2">
                <Label htmlFor="import-department">Target Department *</Label>
                <Select
                  value={selectedDepartmentId}
                  onValueChange={setSelectedDepartmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department for students" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All imported students will be assigned to this department
                </p>
              </div>
            )}

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
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show auto-detection info for AVD */}
            {type === 'students' && isAVD && (
              <Alert>
                <AlertDescription>
                  Students will be organized under their respective departments based on the <strong>department_code</strong> column.
                </AlertDescription>
              </Alert>
            )}

            {/* Summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {validCount} Valid
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                {duplicateCount} Updates
              </Badge>
              {warningCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {warningCount} Warnings
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  {errorCount} Errors
                </Badge>
              )}
            </div>

            {errorCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cannot Import</AlertTitle>
                <AlertDescription>
                  Please fix the {errorCount} error(s) before importing.
                </AlertDescription>
              </Alert>
            )}

            {/* Results Table */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({validationResults.length})</TabsTrigger>
                <TabsTrigger value="valid">Valid ({validCount})</TabsTrigger>
                <TabsTrigger value="issues">Issues ({warningCount + errorCount})</TabsTrigger>
                <TabsTrigger value="duplicates">Updates ({duplicateCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <ValidationTable results={validationResults} />
              </TabsContent>
              <TabsContent value="valid" className="mt-4">
                <ValidationTable results={validationResults.filter(r => r.status === 'valid')} />
              </TabsContent>
              <TabsContent value="issues" className="mt-4">
                <ValidationTable results={validationResults.filter(r => r.status === 'error' || r.status === 'warning')} />
              </TabsContent>
              <TabsContent value="duplicates" className="mt-4">
                <ValidationTable results={validationResults.filter(r => r.status === 'duplicate')} />
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'review' && (
            <Button variant="outline" onClick={() => setStep('upload')} className="mr-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="outline" onClick={resetDialog}>
            Cancel
          </Button>
          {step === 'upload' ? (
            <Button onClick={handleValidate} disabled={!file || isValidating}>
              {isValidating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Eye className="h-4 w-4 mr-2" />
              Validate & Review
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={!canImport || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {validCount + duplicateCount} Records
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Validation results table component
const ValidationTable = ({ results }: { results: ValidationResult[] }) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No records to display
      </div>
    );
  }

  const getStatusBadge = (status: ValidationResult['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">Valid</Badge>;
      case 'duplicate':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 text-xs">Update</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 text-xs">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
    }
  };

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Row</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Dept</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.row} className={result.status === 'error' ? 'bg-destructive/5' : ''}>
              <TableCell className="font-mono text-xs">{result.row}</TableCell>
              <TableCell>{getStatusBadge(result.status)}</TableCell>
              <TableCell className="font-mono text-xs">{result.data.student_id}</TableCell>
              <TableCell className="text-sm">{result.data.full_name}</TableCell>
              <TableCell className="text-xs">{result.data.department_code || '—'}</TableCell>
              <TableCell className="text-xs">{result.data.program || '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{result.message || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
