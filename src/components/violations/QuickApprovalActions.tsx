import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Loader2,
  ChevronDown,
  Send,
  Gavel,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dacDecisionOptions, cmcDecisionOptions } from '@/constants/violationOptions';

interface QuickApprovalActionsProps {
  violation: any;
}

export const QuickApprovalActions = ({ violation }: QuickApprovalActionsProps) => {
  const { user, roles, isSystemAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDeputy = roles.some(r => r.role === 'deputy_department_head');
  const isHead = roles.some(r => r.role === 'department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');

  // Determine what action is available based on workflow status
  const status = violation.workflow_status;
  
  const canSubmitToHead = (isDeputy || isHead) && status === 'draft';
  const canApproveAsHead = isHead && status === 'submitted_to_head';
  const canSubmitToAVD = isHead && status === 'approved_by_head';
  const canApproveAsAVD = isAVD && (status === 'submitted_to_avd' || status === 'approved_by_head');
  const canSetCMCDecision = isAVD && 
    (status === 'approved_by_avd' || status === 'pending_cmc' || 
     status === 'submitted_to_avd' || status === 'approved_by_head');
  
  // No action available
  const noAction = !canSubmitToHead && !canApproveAsHead && !canSubmitToAVD && !canApproveAsAVD && !canSetCMCDecision;

  const handleQuickAction = async (action: string, data: Record<string, any> = {}) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('violations')
        .update(data)
        .eq('id', violation.id);

      if (error) throw error;

      // Show specific notification based on action
      const studentName = violation.students?.full_name || 'Student';
      
      switch (action) {
        case 'submit_to_head':
          toast.success(`📤 Case submitted to Department Head`, {
            description: `${studentName}'s violation case is now pending Head approval.`,
          });
          break;
        case 'approve_head':
          toast.success(`✅ Head Approval Complete`, {
            description: `DAC Decision: ${data.dac_decision}. Ready for AVD review.`,
          });
          break;
        case 'submit_to_avd':
          toast.success(`📤 Submitted to Academic Vice Dean`, {
            description: `${studentName}'s case forwarded for AVD approval.`,
          });
          break;
        case 'approve_avd':
          toast.success(`✅ AVD Approval Complete`, {
            description: `Case ready for final CMC decision.`,
          });
          break;
        case 'cmc_decision':
          toast.success(`⚖️ CMC Decision Recorded`, {
            description: `Final decision: ${data.cmc_decision}`,
          });
          break;
        default:
          toast.success('Action completed successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['violations'] });
    } catch (error: any) {
      toast.error('Action failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (noAction) {
    // Show status badge only
    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      submitted_to_head: 'Awaiting Head',
      approved_by_head: 'Head Approved',
      submitted_to_avd: 'Awaiting AVD',
      approved_by_avd: 'AVD Approved',
      pending_cmc: 'Pending CMC',
      cmc_decided: 'Decided',
      closed: 'Closed',
    };
    return (
      <Badge variant="outline" className="text-xs">
        {statusLabels[status] || status}
      </Badge>
    );
  }

  if (isSubmitting) {
    return (
      <Button size="sm" disabled className="h-7">
        <Loader2 className="h-3 w-3 animate-spin" />
      </Button>
    );
  }

  // Submit to Head
  if (canSubmitToHead) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => handleQuickAction('submit_to_head', {
          workflow_status: 'submitted_to_head',
          submitted_by: user?.id,
          submitted_at: new Date().toISOString(),
        })}
      >
        <Send className="h-3 w-3 mr-1" />
        Submit
      </Button>
    );
  }

  // Head Approval with DAC Decision dropdown
  if (canApproveAsHead) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-7 text-xs bg-primary">
            <Gavel className="h-3 w-3 mr-1" />
            DAC Decision
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Select DAC Decision</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {dacDecisionOptions.filter(d => d !== 'Pending').map((decision) => (
            <DropdownMenuItem
              key={decision}
              onClick={() => handleQuickAction('approve_head', {
                workflow_status: 'approved_by_head',
                dac_decision: decision,
                dac_decision_by: user?.id,
                dac_decision_date: new Date().toISOString().split('T')[0],
                approved_by_head: user?.id,
                head_approved_at: new Date().toISOString(),
              })}
            >
              {decision}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Submit to AVD
  if (canSubmitToAVD) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => handleQuickAction('submit_to_avd', {
          workflow_status: 'submitted_to_avd',
        })}
      >
        <Send className="h-3 w-3 mr-1" />
        To AVD
      </Button>
    );
  }

  // AVD Approval + CMC Decision
  if (canApproveAsAVD || canSetCMCDecision) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-7 text-xs bg-primary">
            <Gavel className="h-3 w-3 mr-1" />
            CMC Decision
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Final CMC Decision</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {cmcDecisionOptions.filter(d => d !== 'Pending').map((decision) => (
            <DropdownMenuItem
              key={decision}
              onClick={() => handleQuickAction('cmc_decision', {
                workflow_status: 'cmc_decided',
                cmc_decision: decision,
                cmc_decision_by: user?.id,
                cmc_decision_date: new Date().toISOString().split('T')[0],
                approved_by_avd: user?.id,
                avd_approved_at: new Date().toISOString(),
              })}
            >
              {decision}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
};
