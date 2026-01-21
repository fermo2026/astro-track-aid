import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Send, 
  CheckCircle, 
  Loader2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const dacDecisionOptions = [
  'Pending',
  'One Grade Down',
  'F Grade for Course',
  'F Grade with Disciplinary Action',
  'Referred to Discipline Committee',
  'Cleared',
];

const cmcDecisionOptions = [
  'Pending',
  'One Grade Down',
  'F Grade for Course',
  'F Grade with Disciplinary Action',
  'Referred to Discipline Committee',
  'Cleared',
];

interface WorkflowActionsProps {
  violation: any;
  onClose?: () => void;
}

// Helper to check if a record is locked (AVD approved with CMC decision made)
export const isRecordLocked = (violation: any): boolean => {
  return (
    violation.workflow_status === 'cmc_decided' ||
    violation.workflow_status === 'closed' ||
    (violation.cmc_decision && violation.cmc_decision !== 'Pending')
  );
};

// Helper to check if department users can edit/take action
export const canDepartmentEdit = (violation: any, isSystemAdmin: boolean, isAVD: boolean): boolean => {
  // System admins and AVDs can always edit
  if (isSystemAdmin || isAVD) return true;
  
  // Once CMC decision is made, departments cannot edit
  return !isRecordLocked(violation);
};

export const WorkflowActions = ({ violation, onClose }: WorkflowActionsProps) => {
  const { user, roles, isSystemAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState<'dac' | 'cmc' | 'workflow'>('workflow');

  const isDeputy = roles.some(r => r.role === 'deputy_department_head');
  const isHead = roles.some(r => r.role === 'department_head');
  const isAVD = roles.some(r => r.role === 'academic_vice_dean');
  
  // Check if record is locked for department users
  const recordLocked = isRecordLocked(violation);
  const departmentCanEdit = canDepartmentEdit(violation, isSystemAdmin, isAVD);

  // Department users can only take actions if the record is not locked
  const canSubmitToHead = departmentCanEdit && (isDeputy || isHead) && violation.workflow_status === 'draft';
  const canApproveAsHead = departmentCanEdit && isHead && violation.workflow_status === 'submitted_to_head';
  const canSubmitToAVD = departmentCanEdit && isHead && violation.workflow_status === 'approved_by_head';
  const canApproveAsAVD = isAVD && violation.workflow_status === 'submitted_to_avd';
  const canSetCMCDecision = (isAVD || isSystemAdmin) && 
    (violation.workflow_status === 'approved_by_avd' || violation.workflow_status === 'pending_cmc');

  const handleWorkflowAction = async (newStatus: string, additionalData: Record<string, any> = {}) => {
    setIsSubmitting(true);
    try {
      const updateData: Record<string, any> = {
        workflow_status: newStatus,
        ...additionalData,
      };

      const { error } = await supabase
        .from('violations')
        .update(updateData)
        .eq('id', violation.id);

      if (error) throw error;

      toast.success('Workflow updated successfully');
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      onClose?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: Record<string, any> = {};
      
      if (actionType === 'dac') {
        updateData.dac_decision = decision;
        updateData.dac_decision_by = user?.id;
        updateData.dac_decision_date = new Date().toISOString().split('T')[0];
      } else if (actionType === 'cmc') {
        updateData.cmc_decision = decision;
        updateData.cmc_decision_by = user?.id;
        updateData.cmc_decision_date = new Date().toISOString().split('T')[0];
        updateData.workflow_status = 'cmc_decided';
      }

      if (notes) {
        updateData.description = violation.description 
          ? `${violation.description}\n\n--- Decision Notes ---\n${notes}`
          : `--- Decision Notes ---\n${notes}`;
      }

      const { error } = await supabase
        .from('violations')
        .update(updateData)
        .eq('id', violation.id);

      if (error) throw error;

      toast.success(`${actionType.toUpperCase()} decision recorded`);
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      setShowDecisionDialog(false);
      onClose?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDecisionDialog = (type: 'dac' | 'cmc') => {
    setActionType(type);
    setDecision(type === 'dac' ? violation.dac_decision : violation.cmc_decision);
    setNotes('');
    setShowDecisionDialog(true);
  };

  // Show locked message for department users
  const showLockedMessage = recordLocked && !isSystemAdmin && !isAVD && (isDeputy || isHead);

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {showLockedMessage && (
          <Badge variant="secondary" className="text-xs bg-muted">
            <Lock className="h-3 w-3 mr-1" />
            Record locked after CMC decision
          </Badge>
        )}
        
        {canSubmitToHead && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleWorkflowAction('submitted_to_head', {
              submitted_by: user?.id,
              submitted_at: new Date().toISOString(),
            })}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Submit to Head
          </Button>
        )}

        {canApproveAsHead && (
          <>
            <Button
              size="sm"
              onClick={() => openDecisionDialog('dac')}
              disabled={isSubmitting}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Set DAC Decision
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleWorkflowAction('approved_by_head', {
                approved_by_head: user?.id,
                head_approved_at: new Date().toISOString(),
              })}
              disabled={isSubmitting}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Approve & Forward
            </Button>
          </>
        )}

        {canSubmitToAVD && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleWorkflowAction('submitted_to_avd')}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Submit to AVD
          </Button>
        )}

        {canApproveAsAVD && (
          <Button
            size="sm"
            onClick={() => handleWorkflowAction('approved_by_avd', {
              approved_by_avd: user?.id,
              avd_approved_at: new Date().toISOString(),
              workflow_status: 'pending_cmc',
            })}
            disabled={isSubmitting}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve for CMC
          </Button>
        )}

        {canSetCMCDecision && (
          <Button
            size="sm"
            onClick={() => openDecisionDialog('cmc')}
            disabled={isSubmitting}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Set CMC Decision
          </Button>
        )}
      </div>

      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'dac' ? 'DAC Decision' : 'CMC Decision'}
            </DialogTitle>
            <DialogDescription>
              Select the committee decision for this violation case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decision *</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select decision" />
                </SelectTrigger>
                <SelectContent>
                  {(actionType === 'dac' ? dacDecisionOptions : cmcDecisionOptions).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Decision Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDecisionSubmit} disabled={isSubmitting || !decision}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
