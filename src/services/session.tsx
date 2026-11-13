import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../data/types';
import { sessionUser } from './api';
import { reload, subscribe } from './db';
import { authUid } from './remote';
import { live, sb } from './supabase';

const Ctx = createContext<User | null>(null);

/**
 * Keeps the signed-in user in sync with the data.
 * In live mode it first loads from Supabase (showing a short loading screen), then reloads whenever someone
 * signs in or out, including in another tab or after opening an email link.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(live ? null : sessionUser);
  const [ready, setReady] = useState(!live);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => subscribe(() => setUser(sessionUser())), []);
  useEffect(() => {
    if (!live) return;
    reload().then(() => { setUser(sessionUser()); setReady(true); }).catch(e => setFailed(e.message ?? 'Could not reach Nestly.'));
    const { data } = sb!.auth.onAuthStateChange((_event, s) => {
      // Supabase asks that no other Supabase call runs inside this callback, so the reload waits a tick.
      const id = s?.user.id ?? null;
      if (id !== authUid) setTimeout(() => { void reload(); }, 0);
    });
    // Other people's changes (a new booking, a visitor) show up within a minute without a refresh.
    const t = setInterval(() => { if (document.visibilityState === 'visible') void reload().catch(() => undefined); }, 60000);
    return () => { data.subscription.unsubscribe(); clearInterval(t); };
  }, []);
  if (failed) return <div className="boot"><b>Nestly could not load</b><p>{failed}</p><button className="btn btn-primary" onClick={() => location.reload()}>Try again</button></div>;
  if (!ready) return <div className="boot" aria-busy="true"><span className="boot-dot" /><p>Loading Nestly...</p></div>;
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}
export const useUser = () => useContext(Ctx);
export const useMe = () => { const u = useContext(Ctx); if (!u) throw new Error('Not signed in'); return u; };
