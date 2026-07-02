import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  try {
    const { email, password, secret } = await req.json();
    if (secret !== "medwallet-bootstrap-2026") return new Response("forbidden", { status: 403 });
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: list, error: le } = await supa.auth.admin.listUsers();
    if (le) throw le;
    const u = list.users.find((x) => (x.email || "").toLowerCase() === String(email).toLowerCase());
    if (!u) return new Response(JSON.stringify({ error: "user not found" }), { status: 404 });
    const { error } = await supa.auth.admin.updateUserById(u.id, { password, email_confirm: true });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: u.id }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});