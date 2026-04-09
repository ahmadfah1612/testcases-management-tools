import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Session cache ───────────────────────────────────────────────────────────
// Problem: supabase.auth.getSession() awaits an internal initializePromise on
// every call. On page refresh, Chrome clears its CORS preflight cache, so
// Supabase's token-refresh request needs an extra OPTIONS round-trip before
// the actual refresh — causing initializePromise to resolve much later than
// in Firefox (which retains the preflight cache). Our api.ts was calling
// getSession() before init finished, getting null, and sending requests
// without an Authorization header.
//
// Fix: subscribe to onAuthStateChange here at module-load time. INITIAL_SESSION
// fires as soon as initialization completes (with or without a token refresh).
// We cache the session synchronously so getHeaders() never calls getSession().

let _session: Session | null = null;
let _initialized = false;
const _pendingInit: Array<() => void> = [];

// Called for every auth event; fires INITIAL_SESSION once init is done.
supabase.auth.onAuthStateChange((_event, session) => {
  _session = session;
  if (!_initialized) {
    _initialized = true;
    _pendingInit.forEach(r => r());
    _pendingInit.length = 0;
  }
});

/**
 * Resolves as soon as INITIAL_SESSION fires (i.e., Supabase is fully initialized
 * and the cached session reflects the real auth state). Resolves immediately on
 * subsequent calls.
 */
export function waitForSession(): Promise<void> {
  if (_initialized) return Promise.resolve();
  return new Promise(resolve => _pendingInit.push(resolve));
}

/**
 * Returns the current session synchronously. No Web Lock, no network call.
 * Kept up-to-date by the onAuthStateChange subscription above.
 */
export function getCachedSession(): Session | null {
  return _session;
}
