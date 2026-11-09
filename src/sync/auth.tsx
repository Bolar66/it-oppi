import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { clearAllData } from '../progress/repo.ts'
import { localModeAllowed, supabase } from './client.ts'
import { SyncController, type SyncStatus } from './controller.ts'
import { supabaseRemote } from './remote.ts'

export type AuthStatus =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; userId: string; email: string }
  /** Kehitystila ilman Supabasea: sovellus toimii vain tällä laitteella. */
  | { kind: 'local' }
  /** Julkaisusta puuttuu Supabasen osoite tai avain. */
  | { kind: 'unconfigured' }

export interface AuthApi {
  status: AuthStatus
  sync: SyncStatus
  sendCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<void>
  syncNow(): Promise<boolean>
  /** Synkronoi, kirjautuu ulos ja tyhjentää laitteen. force: tyhjennä, vaikka synkronointi epäonnistuisi. */
  signOut(force?: boolean): Promise<void>
}

const noop = async () => {}
const LocalApi: AuthApi = {
  status: { kind: 'local' },
  sync: { state: 'idle', error: null },
  sendCode: noop,
  verifyCode: noop,
  syncNow: async () => true,
  signOut: noop,
}

// eslint-disable-next-line react-refresh/only-export-components -- testit antavat oman toteutuksen
export const AuthContext = createContext<AuthApi>(LocalApi)

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthApi {
  return useContext(AuthContext)
}

// eslint-disable-next-line react-refresh/only-export-components
export class SignOutSyncError extends Error {}

/** Selaimeen tallennettu istunto: offline-käynnistyksessä vanhentunutta istuntoa ei voi uusia, mutta käyttäjä pysyy sisällä. */
function storedUser(): { id: string; email: string } | null {
  try {
    const raw = localStorage.getItem('it-oppi-auth')
    const user = raw ? (JSON.parse(raw) as { user?: { id?: string; email?: string } }).user : undefined
    return user?.id ? { id: user.id, email: user.email ?? '' } : null
  } catch {
    return null
  }
}

const statusFrom = (session: Session | null): AuthStatus =>
  session ? { kind: 'signedIn', userId: session.user.id, email: session.user.email ?? '' } : { kind: 'signedOut' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const controller = useMemo(() => (supabase ? new SyncController(supabaseRemote(supabase)) : null), [])
  const [status, setStatus] = useState<AuthStatus>(() =>
    supabase ? { kind: 'loading' } : localModeAllowed ? { kind: 'local' } : { kind: 'unconfigured' },
  )
  const [sync, setSync] = useState<SyncStatus>(() => controller?.getStatus() ?? { state: 'idle', error: null })

  useEffect(() => controller?.subscribe(setSync), [controller])

  // Istunnon seuranta.
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) {
        const offlineUser = navigator.onLine === false ? storedUser() : null
        setStatus(offlineUser ? { kind: 'signedIn', userId: offlineUser.id, email: offlineUser.email } : { kind: 'signedOut' })
        return
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return
      setStatus(statusFrom(session))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Synkronointi käyntiin kirjautuneelle käyttäjälle.
  const userId = status.kind === 'signedIn' ? status.userId : null
  useEffect(() => {
    if (!controller || !userId) return
    void controller.start(userId).catch((e: unknown) => console.error('Synkronoinnin käynnistys epäonnistui', e))
    return () => controller.stop()
  }, [controller, userId])

  const api = useMemo<AuthApi>(
    () => ({
      status,
      sync,
      async sendCode(email) {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
        if (error) throw new Error(otpError(error.message, error.status))
      },
      async verifyCode(email, code) {
        if (!supabase) return
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) throw new Error(otpError(error.message, error.status))
      },
      syncNow: async () => (controller ? controller.syncNow() : true),
      async signOut(force = false) {
        if (!supabase || !controller) return
        const ok = await controller.syncNow()
        if (!ok && !force) throw new SignOutSyncError('Synkronointi ei onnistunut.')
        controller.stop()
        await supabase.auth.signOut({ scope: 'local' })
        await clearAllData()
      },
    }),
    [status, sync, controller],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

function otpError(message: string, status?: number): string {
  if (status === 429 || /rate limit|security purposes/i.test(message)) return 'Liian monta yritystä. Odota hetki ja yritä uudelleen.'
  if (/expired|invalid/i.test(message)) return 'Koodi on väärä tai vanhentunut. Tarkista koodi tai pyydä uusi.'
  if (/fetch|network/i.test(message)) return 'Ei yhteyttä palvelimeen. Tarkista verkkoyhteys.'
  return message
}
