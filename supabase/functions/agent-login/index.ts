// Supabase Edge Function "agent-login"
// Legt fuer einen Mitarbeiter einen Login fuer die Sales-OS-Erweiterung an, setzt das Passwort neu
// oder entfernt den Zugang. Nur fuer Admins (app_users.role = 'admin'). Der Service-Schluessel bleibt auf dem Server.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  // 1) Wer ruft auf? Nur angemeldete Admins.
  const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: au } = await admin.from("app_users").select("role,email,auth_user_id");
  const me = (au ?? []).find((a) => a.auth_user_id === user.id || (a.email ?? "").toLowerCase() === (user.email ?? "").toLowerCase());
  if (!me || me.role !== "admin") return json({ error: "Nur Admins dürfen Zugänge verwalten" }, 403);

  // 2) Auftrag pruefen
  let body: { action?: string; employee_id?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  const { action, employee_id, password } = body;
  if (!employee_id || !["create", "reset", "remove"].includes(action ?? "")) return json({ error: "Ungültige Anfrage" }, 400);

  const { data: emp, error: eErr } = await admin.from("employees")
    .select("id,name,email,auth_user_id,role,is_pure_coach").eq("id", employee_id).single();
  if (eErr || !emp) return json({ error: "Mitarbeiter nicht gefunden" }, 404);
  if (emp.is_pure_coach || emp.role === "SC" || emp.role === "SDM")
    return json({ error: "Coaches haben bereits einen Board-Zugang – hier nur Agents" }, 400);
  if ((action === "create" || action === "reset") && (!password || password.length < 10))
    return json({ error: "Das Passwort muss mindestens 10 Zeichen haben" }, 400);

  const log = (what: string) => admin.from("admin_audit_log").insert({ changed_by: null, action: what, details: `${emp.name} (${me.email})` }).then(() => {}, () => {});

  // 3) Ausfuehren
  if (action === "create") {
    if (emp.auth_user_id) return json({ error: "Dieser Mitarbeiter hat bereits einen Zugang" }, 409);
    if (!emp.email) return json({ error: "Beim Mitarbeiter ist keine E-Mail-Adresse hinterlegt" }, 400);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: emp.email.trim().toLowerCase(), password, email_confirm: true, user_metadata: { employee_id: emp.id, rolle: "agent" },
    });
    if (error || !created.user) {
      const msg = (error?.message ?? "").toLowerCase().includes("already") ? "Für diese E-Mail gibt es bereits einen Login (z. B. manuell in Supabase angelegt)" : (error?.message ?? "Login konnte nicht angelegt werden");
      return json({ error: msg }, 400);
    }
    const { error: uErr } = await admin.from("employees").update({ auth_user_id: created.user.id }).eq("id", emp.id);
    if (uErr) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: "Verknüpfung fehlgeschlagen, Login wurde wieder entfernt" }, 500); }
    await log("agent_zugang_angelegt");
    return json({ ok: true, auth_user_id: created.user.id, email: emp.email });
  }
  if (!emp.auth_user_id) return json({ error: "Dieser Mitarbeiter hat noch keinen Zugang" }, 400);
  if (action === "reset") {
    const { error } = await admin.auth.admin.updateUserById(emp.auth_user_id, { password });
    if (error) return json({ error: error.message }, 400);
    await log("agent_passwort_neu");
    return json({ ok: true });
  }
  // remove
  const { error: dErr } = await admin.auth.admin.deleteUser(emp.auth_user_id);
  if (dErr && !dErr.message.toLowerCase().includes("not found")) return json({ error: dErr.message }, 400);
  await admin.from("employees").update({ auth_user_id: null }).eq("id", emp.id);
  await log("agent_zugang_entfernt");
  return json({ ok: true });
});
