/**
 * Violation Types and Decision Options
 * Based on ASTU Senate Legislation (August 2017) and Ethiopian university standards
 * 
 * Workflow: DAC (Department Academic Council) → CMC (College Management Council)
 */

// Types of examination violations
export const violationTypes = [
  'Possession of Unauthorized Materials',
  'Copying from Another Student',
  'Allowing Another to Copy',
  'Using Electronic Device',
  'Communicating with Other Students',
  'Impersonation',
  'Bringing Unauthorized Person',
  'Leaving Exam Room Unauthorized',
  'Plagiarism',
  'Fabrication of Data',
  'Tampering with Exam Materials',
  'Other',
] as const;

// DAC (Department Academic Council) Decision Options
// Department level decisions - initial penalties for first-time offenders
export const dacDecisionOptions = [
  'Pending',
  'Verbal Warning',
  'Written Warning',
  'One Grade Deduction',
  'Zero Mark for the Exam',
  'F Grade for Course',
  'F Grade with Academic Probation',
  'Referred to CMC',
  'Cleared',
] as const;

// CMC (College Management Council) Decision Options  
// College level decisions - final authority for severe cases and appeals
export const cmcDecisionOptions = [
  'Pending',
  'Uphold DAC Decision',
  'Written Warning',
  'Zero Mark for the Exam',
  'F Grade for Course',
  'F Grade with Academic Probation',
  'Suspension (1 Semester)',
  'Suspension (2 Semesters)',
  'Suspension (1 Academic Year)',
  'Dismissal',
  'Referred to University Discipline Committee',
  'Cleared',
] as const;

// Exam types
export const examTypes = [
  'Mid Exam',
  'Final Exam',
  'Quiz',
  'Assignment',
  'Lab Exam',
  'Re-exam',
  'Makeup Exam',
] as const;

// Type exports for TypeScript
export type ViolationType = typeof violationTypes[number];
export type DACDecision = typeof dacDecisionOptions[number];
export type CMCDecision = typeof cmcDecisionOptions[number];
export type ExamType = typeof examTypes[number];

// Helper to get badge variant based on decision severity
export const getDecisionBadgeVariant = (decision: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const severeDecisions = ['Dismissal', 'Suspension (1 Academic Year)', 'Referred to University Discipline Committee'];
  const warningDecisions = ['F Grade for Course', 'F Grade with Academic Probation', 'Suspension (1 Semester)', 'Suspension (2 Semesters)'];
  const pendingDecisions = ['Pending', 'Referred to CMC'];
  const clearedDecisions = ['Cleared', 'Verbal Warning', 'Written Warning'];
  
  if (severeDecisions.includes(decision)) return 'destructive';
  if (warningDecisions.includes(decision)) return 'default';
  if (pendingDecisions.includes(decision)) return 'secondary';
  if (clearedDecisions.includes(decision)) return 'outline';
  return 'secondary';
};
