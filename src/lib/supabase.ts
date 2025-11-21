import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} 環境変数が設定されていません`);
  }
  return value;
}

let cachedSupabase: SupabaseClient | undefined;
let cachedSupabaseAdmin: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedSupabase) {
    const url = requireEnv('SUPABASE_URL', process.env.SUPABASE_URL);
    const anonKey = requireEnv('SUPABASE_PUBLISHABLE_KEY', process.env.SUPABASE_PUBLISHABLE_KEY);
    cachedSupabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return cachedSupabase;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!cachedSupabaseAdmin) {
    const url = requireEnv('SUPABASE_URL', process.env.SUPABASE_URL);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

    if (!serviceKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY もしくは SUPABASE_SECRET_KEY が設定されていません。Storage のアップロードには Service Role Key が必須です。',
      );
    }

    cachedSupabaseAdmin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return cachedSupabaseAdmin;
}
