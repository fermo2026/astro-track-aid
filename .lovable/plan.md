
# Plan: Workflow Verification and Role-Based Notification System

## Summary
This plan addresses two main areas: (1) fixing the AVD college assignment issue that prevents proper workflow functioning, and (2) implementing a comprehensive notification system that alerts each role when cases require their attention.

---

## Current State Analysis

### Workflow Status
The workflow has these states in order:
- `draft` - Created by Deputy/Head
- `submitted_to_head` - Awaiting Department Head approval
- `approved_by_head` - Head approved, ready for AVD
- `submitted_to_avd` - Submitted to Academic Vice Dean
- `approved_by_avd` / `pending_cmc` - Awaiting CMC decision
- `cmc_decided` - Final decision made
- `closed` - Case completed

### Issues Found

1. **AVD College Assignment Missing**
   - The existing AVD user (`adaa.soeec@astu.edu.et`) has `college_id: null` in the `user_roles` table
   - This prevents RLS policies from working correctly for college-level data access
   - The AVD cannot see violations from departments within their college

2. **No Email Notifications**
   - Only client-side toast notifications exist
   - No system to notify the next role holder when a case moves to their queue
   - College Dean and Registrar roles have no way to be notified of new cases

3. **Pending Actions Query**
   - The AVD's pending actions widget cannot filter by college since college_id is null
   - This affects the dashboard's "Pending Actions" counts

---

## Implementation Plan

### Phase 1: Fix AVD College Assignment (Database Fix)

**Action Required**: Update the existing AVD user role to include the correct college_id.

```text
SQL Migration:
- UPDATE user_roles SET college_id = [CoEEC college ID] 
  WHERE role = 'academic_vice_dean' AND college_id IS NULL
```

### Phase 2: Create Notification System

#### 2.1 Create Notifications Table
Create a database table to store in-app notifications:

```text
Table: notifications
- id (uuid, primary key)
- user_id (uuid, references profiles)
- type (enum: 'case_submitted', 'case_approved', 'action_required', 'decision_made')
- title (text)
- message (text)
- violation_id (uuid, optional reference)
- is_read (boolean, default false)
- created_at (timestamp)
```

#### 2.2 Create Notification Edge Function
Build an edge function to send notifications when workflow status changes:

```text
Edge Function: send-workflow-notification
- Triggered after violation status update
- Determines which users need to be notified based on new status
- Creates notification records for appropriate role holders
- Optionally sends email notifications (future enhancement)
```

#### 2.3 Implement Notification Triggers

| Workflow Transition | Notify |
|---------------------|--------|
| Draft -> Submitted to Head | Department Head(s) in same department |
| Submitted to Head -> Approved by Head | Deputy (confirmation), AVD in college |
| Approved by Head -> Submitted to AVD | AVD in college |
| Any change to CMC Decided | College Dean, College Registrar, Department Head, Deputy |

#### 2.4 Add Notification UI Components
- Create a notification dropdown/bell icon in the header
- Show unread notification count badge
- List of recent notifications with links to relevant cases
- Mark as read functionality

### Phase 3: Enhanced Pending Actions

#### 3.1 Update PendingActionsWidget for AVD
Fix the query to properly filter by college when the user is an AVD:

```text
- Fetch the AVD's college_id from their role
- Query violations where student's department belongs to AVD's college
- Group by workflow_status
```

#### 3.2 Add Real-time Updates
Enable real-time subscription for notifications table so users see new notifications immediately without refresh.

---

## Technical Implementation Details

### Database Changes
1. Create `notifications` table with RLS policies
2. Create notification type enum
3. Add database trigger or edge function hook for workflow changes

### New Files to Create
- `supabase/functions/send-workflow-notification/index.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationList.tsx`
- `src/hooks/useNotifications.ts`

### Files to Modify
- `src/components/layout/Header.tsx` - Add notification bell
- `src/components/dashboard/PendingActionsWidget.tsx` - Fix AVD college filtering
- `src/components/violations/QuickApprovalActions.tsx` - Trigger notifications
- `src/components/violations/WorkflowActions.tsx` - Trigger notifications

---

## Notification Flow Diagram

```text
                    +------------------+
                    |   Deputy/Head    |
                    |  Creates Draft   |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | Submit to Head   |-----> Notify: Department Head
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |  Head Approves   |-----> Notify: Deputy (confirmation)
                    | Sets DAC Decision|-----> Notify: AVD (action needed)
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |  Submit to AVD   |-----> Notify: AVD (reminder)
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   AVD Approves   |
                    | Sets CMC Decision|-----> Notify: All stakeholders
                    +------------------+             - Department Head
                                                     - Deputy
                                                     - College Dean
                                                     - College Registrar
```

---

## Priority Order

1. **Critical**: Fix AVD college_id assignment (database update)
2. **High**: Create notifications table and basic notification creation
3. **High**: Add notification UI to header
4. **Medium**: Implement real-time notification updates
5. **Low**: Add email notification capability (future enhancement)

---

## Expected Outcomes

After implementation:
- AVD will properly see all violations from departments in their college
- Each role holder will receive in-app notifications when cases require their attention
- The dashboard's pending actions will accurately reflect items for each role
- College Dean and Registrar will be notified of CMC decisions in their college
- All workflow transitions will be tracked and communicated

