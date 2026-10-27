-- SCHRITT 0 (nur lesen): Wer würde nach der Umstellung als "Staff" (Admin/Coach/Betrachter) gelten?
-- Jeder heutige Nutzer von Sales OS muss hier staff = true haben. Sonst NICHT weitermachen.
select u.email,
       exists (select 1 from public.app_users a
               where a.auth_user_id::text = u.id::text or lower(a.email) = lower(u.email))      as in_admins_betrachter,
       e.name  as mitarbeiter,
       e.role  as rolle,
       (exists (select 1 from public.app_users a
                where a.auth_user_id::text = u.id::text or lower(a.email) = lower(u.email))
        or coalesce(e.is_pure_coach, false)
        or e.role in ('SC','SDM'))                                                  as staff
from auth.users u
left join public.employees e on e.auth_user_id::text = u.id::text
order by staff, u.email;
