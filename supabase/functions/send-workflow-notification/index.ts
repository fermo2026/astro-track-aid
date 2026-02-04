import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  violation_id: string;
  new_status: string;
  previous_status: string;
  triggered_by: string;
  student_name: string;
  department_id: string;
  college_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const {
      violation_id,
      new_status,
      previous_status,
      triggered_by,
      student_name,
      department_id,
      college_id,
    } = payload;

    console.log("Processing notification for status change:", {
      violation_id,
      new_status,
      previous_status,
    });

    const notifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      violation_id: string;
    }> = [];

    // Helper to get users by role in department
    const getUsersByRoleInDepartment = async (role: string, deptId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role)
        .eq("department_id", deptId);
      return data?.map((r) => r.user_id) || [];
    };

    // Helper to get users by role in college
    const getUsersByRoleInCollege = async (role: string, collegeId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role)
        .eq("college_id", collegeId);
      return data?.map((r) => r.user_id) || [];
    };

    // Determine who to notify based on status transition
    switch (new_status) {
      case "submitted_to_head": {
        // Notify Department Heads in the same department
        const heads = await getUsersByRoleInDepartment(
          "department_head",
          department_id
        );
        for (const userId of heads) {
          if (userId !== triggered_by) {
            notifications.push({
              user_id: userId,
              type: "action_required",
              title: "New Case Submitted",
              message: `A violation case for ${student_name} has been submitted and requires your review.`,
              violation_id,
            });
          }
        }
        break;
      }

      case "approved_by_head": {
        // Notify Deputy (confirmation) - the one who submitted
        const deputies = await getUsersByRoleInDepartment(
          "deputy_department_head",
          department_id
        );
        for (const userId of deputies) {
          if (userId !== triggered_by) {
            notifications.push({
              user_id: userId,
              type: "case_approved",
              title: "Case Approved by Head",
              message: `The violation case for ${student_name} has been approved by the Department Head.`,
              violation_id,
            });
          }
        }

        // Notify AVD in the college about pending case
        if (college_id) {
          const avds = await getUsersByRoleInCollege(
            "academic_vice_dean",
            college_id
          );
          for (const userId of avds) {
            notifications.push({
              user_id: userId,
              type: "action_required",
              title: "Case Ready for Review",
              message: `A violation case for ${student_name} has been approved by the Department Head and is ready for your review.`,
              violation_id,
            });
          }
        }
        break;
      }

      case "submitted_to_avd": {
        // Notify AVD in the college
        if (college_id) {
          const avds = await getUsersByRoleInCollege(
            "academic_vice_dean",
            college_id
          );
          for (const userId of avds) {
            if (userId !== triggered_by) {
              notifications.push({
                user_id: userId,
                type: "action_required",
                title: "Case Submitted for AVD Review",
                message: `A violation case for ${student_name} has been submitted for your review and CMC decision.`,
                violation_id,
              });
            }
          }
        }
        break;
      }

      case "pending_cmc":
      case "approved_by_avd": {
        // Notify relevant parties that AVD has approved
        const deputies = await getUsersByRoleInDepartment(
          "deputy_department_head",
          department_id
        );
        const heads = await getUsersByRoleInDepartment(
          "department_head",
          department_id
        );

        for (const userId of [...deputies, ...heads]) {
          if (userId !== triggered_by) {
            notifications.push({
              user_id: userId,
              type: "case_approved",
              title: "Case Approved by AVD",
              message: `The violation case for ${student_name} has been approved by the Academic Vice Dean. Awaiting CMC decision.`,
              violation_id,
            });
          }
        }
        break;
      }

      case "cmc_decided": {
        // Notify all stakeholders: Department users, College Dean, Registrar
        const deputies = await getUsersByRoleInDepartment(
          "deputy_department_head",
          department_id
        );
        const heads = await getUsersByRoleInDepartment(
          "department_head",
          department_id
        );

        for (const userId of [...deputies, ...heads]) {
          if (userId !== triggered_by) {
            notifications.push({
              user_id: userId,
              type: "decision_made",
              title: "CMC Decision Made",
              message: `A final CMC decision has been made for ${student_name}'s violation case.`,
              violation_id,
            });
          }
        }

        // Notify College Dean and Registrar
        if (college_id) {
          const deans = await getUsersByRoleInCollege("college_dean", college_id);
          const registrars = await getUsersByRoleInCollege(
            "college_registrar",
            college_id
          );

          for (const userId of [...deans, ...registrars]) {
            if (userId !== triggered_by) {
              notifications.push({
                user_id: userId,
                type: "decision_made",
                title: "CMC Decision Finalized",
                message: `A final CMC decision has been recorded for ${student_name}'s violation case in your college.`,
                violation_id,
              });
            }
          }
        }
        break;
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) {
        console.error("Error inserting notifications:", error);
        throw error;
      }
      console.log(`Created ${notifications.length} notifications`);
    } else {
      console.log("No notifications to create for this transition");
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
