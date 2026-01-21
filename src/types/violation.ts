export type ExamType = 'Mid Exam' | 'Final Exam';

export type ViolationType = 
  | 'Cheating with Notes'
  | 'Copying from Another Student'
  | 'Using Electronic Device'
  | 'Impersonation'
  | 'Collaboration'
  | 'Plagiarism'
  | 'Other';

export type DecisionStatus = 
  | 'Pending'
  | 'Warning Issued'
  | 'Grade Penalty'
  | 'Course Failure'
  | 'Suspension'
  | 'Expulsion'
  | 'Cleared';

export type UserRole = 
  | 'Deputy Department Head'
  | 'Department Head'
  | 'Academic Vice Dean'
  | 'College Dean'
  | 'College Registrar'
  | 'Main Registrar'
  | 'VPAA';

export interface ViolationRecord {
  id: string;
  studentFullName: string;
  studentId: string;
  department: string;
  program: string;
  examType: ExamType;
  incidentDate: string;
  courseName: string;
  courseCode: string;
  invigilator: string;
  dacDecision: DecisionStatus;
  cmcDecision: DecisionStatus;
  violationType: ViolationType;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
}

export interface DashboardStats {
  totalViolations: number;
  pendingCases: number;
  resolvedCases: number;
  thisMonthViolations: number;
}
