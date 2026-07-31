ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS province_id text;

DO $$
DECLARE tbl record; has_priv boolean; has_public_policy boolean;
BEGIN
  FOR tbl IN SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' LOOP
    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee='authenticated' AND table_schema='public' AND table_name=tbl.t AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.t);
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee='service_role' AND table_schema='public' AND table_name=tbl.t AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.t);
    END IF;

    -- anon read only where a policy permits public (non auth.uid-scoped) reads
    SELECT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=tbl.t
        AND p.cmd IN ('SELECT','ALL')
        AND ('anon' = ANY(p.roles) OR 'public' = ANY(p.roles))
        AND coalesce(p.qual,'true') NOT ILIKE '%auth.uid%'
    ) INTO has_public_policy;
    SELECT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee='anon' AND table_schema='public' AND table_name=tbl.t AND privilege_type='SELECT') INTO has_priv;
    IF has_public_policy AND NOT has_priv THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl.t);
    END IF;
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;