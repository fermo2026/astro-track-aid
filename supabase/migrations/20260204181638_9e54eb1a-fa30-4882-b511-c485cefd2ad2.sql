-- Add missing decision status values to the enum for Department Heads
-- This allows DAC (Department) level to apply probation and other decisions

-- Add 'F Grade with Academic Probation' for DAC probation decisions
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'F Grade with Academic Probation';

-- Add 'Verbal Warning' for minor first-time offenses
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Verbal Warning';

-- Add 'Written Warning' for documented warnings
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Written Warning';

-- Add 'One Grade Deduction' for grade penalty
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'One Grade Deduction';

-- Add 'Referred to CMC' for cases needing college-level review
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Referred to CMC';

-- Add CMC-specific options
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Uphold DAC Decision';
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Suspension (1 Semester)';
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Suspension (2 Semesters)';
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Suspension (1 Academic Year)';
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Dismissal';
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'Referred to University Discipline Committee';