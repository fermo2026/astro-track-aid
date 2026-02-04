import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract the token from the header
    const token = authHeader.replace("Bearer ", "");

    // Create admin client for all operations (including token verification)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Use getUser with token parameter to verify the JWT
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      console.error("Token verification error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if the requesting user is a system_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "system_admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Only system administrators can delete users" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete user roles first
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Delete profile
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in delete-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
