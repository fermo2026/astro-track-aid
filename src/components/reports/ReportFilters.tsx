import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ReportFilters as ReportFiltersType } from '@/hooks/useReportData';
import { Constants } from '@/integrations/supabase/types';

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  departments: { id: string; name: string }[];
  onReset: () => void;
}

export const ReportFilters = ({
  filters,
  onFiltersChange,
  departments,
  onReset,
}: ReportFiltersProps) => {
  const violationTypes = Constants.public.Enums.violation_type;
  const examTypes = Constants.public.Enums.exam_type;
  const programTypes = Constants.public.Enums.program_type;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !filters.dateFrom && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'From date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom || undefined}
            onSelect={(date) =>
              onFiltersChange({ ...filters, dateFrom: date || null })
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !filters.dateTo && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateTo ? format(filters.dateTo, 'PPP') : 'To date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo || undefined}
            onSelect={(date) =>
              onFiltersChange({ ...filters, dateTo: date || null })
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Department */}
      <Select
        value={filters.departmentId}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, departmentId: value })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Violation Type */}
      <Select
        value={filters.violationType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, violationType: value })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Violation Types" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Violation Types</SelectItem>
          {violationTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Exam Type */}
      <Select
        value={filters.examType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, examType: value })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Exam Types" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Exam Types</SelectItem>
          {examTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
        </SelectContent>
      </Select>

      {/* Program */}
      <Select
        value={filters.program}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, program: value })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Programs" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Programs</SelectItem>
          {programTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset Button */}
      <Button variant="outline" onClick={onReset} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Reset Filters
      </Button>
    </div>
  );
};
