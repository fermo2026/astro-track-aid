import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "12345678";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the user from the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
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
        JSON.stringify({ error: "Only system administrators can reset passwords" }),
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

    // Reset the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: DEFAULT_PASSWORD,
    });

    if (updateError) {
      console.error("Error resetting password:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update profile to require password change
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset to default successfully. User will be required to change it on next login." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
