import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { departments, programs } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

const violationTypes = [
  'Cheating with Notes',
  'Copying from Another Student',
  'Using Electronic Device',
  'Impersonation',
  'Collaboration',
  'Plagiarism',
  'Other',
];

const decisionStatuses = [
  'Pending',
  'One Grade Down',
  'F Grade for Course',
  'F Grade with Disciplinary Action',
  'Referred to Discipline Committee',
  'Cleared',
];

export const ViolationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: 'Violation Record Created',
      description: 'The violation record has been successfully saved.',
    });

    setIsSubmitting(false);
    navigate('/violations');
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">New Violation Record</CardTitle>
        <CardDescription>
          Enter the details of the examination violation incident below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Full Name *</Label>
                <Input id="studentName" placeholder="Enter student's full name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input id="studentId" placeholder="e.g., ETS0123/14" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((prog) => (
                      <SelectItem key={prog} value={prog}>
                        {prog}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Incident Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examType">Exam Type *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mid Exam">Mid Exam</SelectItem>
                    <SelectItem value="Final Exam">Final Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="incidentDate">Incident Date *</Label>
                <Input id="incidentDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name *</Label>
                <Input id="courseName" placeholder="Enter course name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code *</Label>
                <Input id="courseCode" placeholder="e.g., CS301" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invigilator">Invigilator *</Label>
                <Input id="invigilator" placeholder="Enter invigilator name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="violationType">Violation Type *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select violation type" />
                  </SelectTrigger>
                  <SelectContent>
                    {violationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Decisions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Committee Decisions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dacDecision">DAC Decision</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select DAC decision" />
                  </SelectTrigger>
                  <SelectContent>
                    {decisionStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cmcDecision">CMC Decision</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CMC decision" />
                  </SelectTrigger>
                  <SelectContent>
                    {decisionStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional notes or details about the incident..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/violations')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
