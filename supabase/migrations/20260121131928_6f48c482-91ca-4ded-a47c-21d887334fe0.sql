-- Update decision_status enum with new values
-- First, we need to add the new values to the enum

ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'One Grade Down';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'F Grade for Course';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'F Grade with Disciplinary Action';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'Referred to Discipline Committee';

-- Create workflow_status enum for approval workflow
CREATE TYPE public.workflow_status AS ENUM (
  'draft',
  'submitted_to_head',
  'approved_by_head',
  'submitted_to_avd',
  'approved_by_avd',
  'pending_cmc',
  'cmc_decided',
  'closed'
);

-- Add workflow columns to violations table
ALTER TABLE public.violations 
  ADD COLUMN IF NOT EXISTS workflow_status workflow_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_by_head uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS head_approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_by_avd uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS avd_approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_repeat_offender boolean NOT NULL DEFAULT false;

-- Create index for workflow status
CREATE INDEX IF NOT EXISTS idx_violations_workflow_status ON public.violations(workflow_status);