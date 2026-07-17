CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  caller uuid := auth.uid();
  existing_admins int;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  perform 1 from public.user_roles where user_id = caller and role = 'admin';
  if found then
    return jsonb_build_object('ok', true, 'already', true, 'promoted', caller);
  end if;

  select count(*) into existing_admins from public.user_roles where role = 'admin';
  if existing_admins > 0 then
    raise exception 'Ja existe admin no sistema. Pede ao admin atual para te promover.';
  end if;

  insert into public.user_roles (user_id, role) values (caller, 'admin');

  return jsonb_build_object('ok', true, 'promoted', caller);
end;
$function$;