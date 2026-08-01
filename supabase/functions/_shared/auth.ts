import { createClient } from 'npm:@supabase/supabase-js@2';

export const authCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function deny(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...authCorsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Validates the caller's JWT. Returns { userId } or a 401 Response. */
export async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return deny(401, 'Unauthorized');

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (error || !data?.claims?.sub) return deny(401, 'Unauthorized');
  return { userId: data.claims.sub as string };
}

/** Validates the caller's JWT and requires one of the given roles. */
export async function requireRole(
  req: Request,
  roles: string[] = ['admin'],
): Promise<{ userId: string } | Response> {
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.userId)
    .in('role', roles)
    .limit(1)
    .maybeSingle();
  if (!data) return deny(403, 'Forbidden');
  return user;
}

/**
 * For scheduled jobs: allows the internal cron caller (x-cron-secret header
 * matching CRON_SECRET) or an authenticated admin. Anything else is rejected.
 */
export async function requireCronOrAdmin(req: Request): Promise<null | Response> {
  const secret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');
  if (secret && provided && provided === secret) return null;

  const res = await requireRole(req, ['admin']);
  if (res instanceof Response) return res;
  return null;
}
