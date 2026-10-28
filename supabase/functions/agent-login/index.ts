// Supabase Edge Function "agent-login"
// Verwaltet Logins fuer Sales OS: anlegen, Passwort neu setzen, entfernen – fuer Mitarbeiter (Agents, Coaches)
// und fuer Admins/Betrachter. Liefert ausserdem den Login-Status aller Personen (action 'list').
// Nur fuer Admins (app_users.role = 'admin'). Der Service-Schluessel bleibt auf dem Server.
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
  let body: { action?: string; employee_id?: string; app_user_id?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  const { action, password } = body;

  if (action === "list") {
    const out: { id: string; email: string | undefined; last_sign_in_at: string | null }[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      data.users.forEach((u) => out.push({ id: u.id, email: u.email, last_sign_in_at: u.last_sign_in_at ?? null }));
      if (data.users.length < 200) break;
    }
    return json({ ok: true, users: out });
  }
  if (!["create", "reset", "remove"].includes(action ?? "")) return json({ error: "Ungültige Anfrage" }, 400);

  // Ziel: Mitarbeiter (employees) oder Admin/Betrachter (app_users)
  const table = body.app_user_id ? "app_users" : "employees";
  const targetId = body.app_user_id ?? body.employee_id;
  if (!targetId) return json({ error: "Ungültige Anfrage" }, 400);
  const { data: tgt, error: tErr } = await admin.from(table).select("id,name,email,auth_user_id").eq("id", targetId).single();
  if (tErr || !tgt) return json({ error: "Person nicht gefunden" }, 404);
  if ((action === "create" || action === "reset") && (!password || password.length < 10))
    return json({ error: "Das Passwort muss mindestens 10 Zeichen haben" }, 400);

  const log = (what: string) => admin.from("admin_audit_log").insert({ changed_by: null, action: what, details: `${tgt.name} (${me.email})` }).then(() => {}, () => {});
  const email = (tgt.email ?? "").trim().toLowerCase();

  // Login-ID ermitteln: verknuepft, sonst ueber die E-Mail (z. B. frueher manuell in Supabase angelegt)
  let authId: string | null = tgt.auth_user_id ?? null;
  if (!authId && email) {
    for (let page = 1; page <= 10 && !authId; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const hit = data?.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (hit) authId = hit.id;
      if (!data || data.users.length < 200) break;
    }
  }

  // 3) Ausfuehren
  if (action === "create") {
    if (authId) return json({ error: "Für diese Person gibt es bereits einen Login" }, 409);
    if (!email) return json({ error: "Bei dieser Person ist keine E-Mail-Adresse hinterlegt" }, 400);
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !created.user) return json({ error: error?.message ?? "Login konnte nicht angelegt werden" }, 400);
    const { error: uErr } = await admin.from(table).update({ auth_user_id: created.user.id }).eq("id", tgt.id);
    if (uErr) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: "Verknüpfung fehlgeschlagen, Login wurde wieder entfernt" }, 500); }
    await log("login_angelegt");
    return json({ ok: true, auth_user_id: created.user.id, email });
  }
  if (!authId) return json({ error: "Für diese Person gibt es noch keinen Login" }, 400);
  if (action === "reset") {
    const { error } = await admin.auth.admin.updateUserById(authId, { password });
    if (error) return json({ error: error.message }, 400);
    await log("login_passwort_neu");
    return json({ ok: true });
  }
  // remove: eigenen Login nicht loeschen
  if (authId === user.id) return json({ error: "Den eigenen Login kannst du nicht entfernen" }, 400);
  const { error: dErr } = await admin.auth.admin.deleteUser(authId);
  if (dErr && !dErr.message.toLowerCase().includes("not found")) return json({ error: dErr.message }, 400);
  await admin.from(table).update({ auth_user_id: null }).eq("id", tgt.id);
  await log("login_entfernt");
  return json({ ok: true });
});
