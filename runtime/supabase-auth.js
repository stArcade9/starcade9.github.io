import { createClient } from '@supabase/supabase-js';

function envValue(env, key) {
  return env && typeof env[key] === 'string' ? env[key].trim() : '';
}

export function configureSupabaseAuth(auth, env, opts = {}) {
  const url = envValue(env, 'VITE_SUPABASE_URL');
  const key =
    envValue(env, 'VITE_SUPABASE_PUBLISHABLE_KEY') || envValue(env, 'VITE_SUPABASE_ANON_KEY');
  if (!url || !key || !auth || typeof auth.configure !== 'function') return null;

  const makeClient = opts.createClient || createClient;
  const client = makeClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  auth.configure({ client });
  return client;
}
