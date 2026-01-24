/**
 * Repeat Offender Detection and Penalty Escalation
 * Based on ASTU Senate Legislation (August 2017)
 * 
 * Escalation Rules:
 * - 1st offense: Warning to F Grade (DAC level)
 * - 2nd offense: F Grade with Academic Probation to Suspension (CMC level)
 * - 3rd+ offense: Suspension to Dismissal (CMC level, referral to University)
 */

import { supabase } from '@/integrations/supabase/client';
import type { DACDecision, CMCDecision } from '@/constants/violationOptions';

export interface ViolationHistory {
  id: string;
  incident_date: string;
  violation_type: string;
  dac_decision: string;
  cmc_decision: string;
  workflow_status: string;
}

export interface RepeatOffenderInfo {
  isRepeatOffender: boolean;
  priorViolationCount: number;
  violations: ViolationHistory[];
  riskLevel: 'none' | 'moderate' | 'high' | 'severe';
  suggestedDACDecision: DACDecision;
  suggestedCMCDecision: CMCDecision;
  escalationMessage: string;
}

/**
 * Fetch student's violation history and determine repeat offender status
 */
export const checkRepeatOffender = async (studentId: string): Promise<RepeatOffenderInfo> => {
  const { data: violations, error } = await supabase
    .from('violations')
    .select('id, incident_date, violation_type, dac_decision, cmc_decision, workflow_status')
    .eq('student_id', studentId)
    .order('incident_date', { ascending: false });

  if (error) {
    console.error('Error checking repeat offender status:', error);
    return getDefaultInfo();
  }

  const priorCount = violations?.length || 0;
  
  return calculateEscalation(priorCount, violations || []);
};

/**
 * Calculate penalty escalation based on prior offense count
 * Aligned with ASTU Senate Legislation disciplinary progression
 */
const calculateEscalation = (priorCount: number, violations: ViolationHistory[]): RepeatOffenderInfo => {
  // First offense - standard DAC penalties
  if (priorCount === 0) {
    return {
      isRepeatOffender: false,
      priorViolationCount: 0,
      violations: [],
      riskLevel: 'none',
      suggestedDACDecision: 'Pending',
      suggestedCMCDecision: 'Pending',
      escalationMessage: '',
    };
  }

  // Second offense - escalate to F Grade with probation
  if (priorCount === 1) {
    return {
      isRepeatOffender: true,
      priorViolationCount: 1,
      violations,
      riskLevel: 'moderate',
      suggestedDACDecision: 'F Grade with Academic Probation',
      suggestedCMCDecision: 'Uphold DAC Decision',
      escalationMessage: '⚠️ Second offense detected. ASTU legislation recommends F Grade with Academic Probation.',
    };
  }

  // Third offense - suspension recommended
  if (priorCount === 2) {
    return {
      isRepeatOffender: true,
      priorViolationCount: 2,
      violations,
      riskLevel: 'high',
      suggestedDACDecision: 'Referred to CMC',
      suggestedCMCDecision: 'Suspension (1 Semester)',
      escalationMessage: '🚨 Third offense detected! ASTU legislation recommends Suspension (1 Semester) or higher.',
    };
  }

  // Fourth+ offense - dismissal or university referral
  return {
    isRepeatOffender: true,
    priorViolationCount: priorCount,
    violations,
    riskLevel: 'severe',
    suggestedDACDecision: 'Referred to CMC',
    suggestedCMCDecision: priorCount >= 4 ? 'Referred to University Discipline Committee' : 'Dismissal',
    escalationMessage: `🔴 ${priorCount + 1}th offense! ASTU legislation mandates Dismissal or referral to University Discipline Committee.`,
  };
};

const getDefaultInfo = (): RepeatOffenderInfo => ({
  isRepeatOffender: false,
  priorViolationCount: 0,
  violations: [],
  riskLevel: 'none',
  suggestedDACDecision: 'Pending',
  suggestedCMCDecision: 'Pending',
  escalationMessage: '',
});

/**
 * Get risk level badge color
 */
export const getRiskLevelColor = (level: RepeatOffenderInfo['riskLevel']): string => {
  switch (level) {
    case 'severe':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'moderate':
      return 'bg-warning text-warning-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

/**
 * Check if a decision is the suggested one for highlighting
 */
export const isRecommendedDecision = (
  decision: string, 
  info: RepeatOffenderInfo, 
  level: 'dac' | 'cmc'
): boolean => {
  if (!info.isRepeatOffender) return false;
  
  if (level === 'dac') {
    return decision === info.suggestedDACDecision;
  }
  return decision === info.suggestedCMCDecision;
};

/**
 * Hook-compatible function to update is_repeat_offender flag on violation
 */
export const updateRepeatOffenderFlag = async (
  violationId: string, 
  isRepeatOffender: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('violations')
    .update({ is_repeat_offender: isRepeatOffender })
    .eq('id', violationId);

  if (error) {
    console.error('Error updating repeat offender flag:', error);
  }
};
