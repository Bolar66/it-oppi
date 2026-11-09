import { db } from '../progress/db.ts'
import { bindUser, syncOnce } from './engine.ts'
import { onLocalChange } from './notify.ts'
import type { Remote } from './remote.ts'

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncStatus {
  state: SyncState
  error: string | null
}

const DEBOUNCE_MS = 2_000
const INTERVAL_MS = 5 * 60_000

/**
 * Ajaa synkronoinnin taustalla kirjautuneelle käyttäjälle: heti alussa, pian paikallisen muutoksen
 * jälkeen, kun verkko palaa, kun sovellus tulee näkyviin tai piiloon, ja muuten viiden minuutin välein.
 */
export class SyncController {
  private status: SyncStatus = { state: 'idle', error: null }
  private listeners = new Set<(s: SyncStatus) => void>()
  private running: Promise<void> | null = null
  private again = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private cleanup: (() => void)[] = []

  constructor(private remote: Remote) {}

  getStatus(): SyncStatus {
    return this.status
  }

  subscribe(fn: (s: SyncStatus) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private setStatus(s: SyncStatus) {
    this.status = s
    for (const fn of this.listeners) fn(s)
  }

  async start(userId: string): Promise<void> {
    this.stop()
    await bindUser(db, userId)
    const debounced = () => {
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => void this.syncNow(), DEBOUNCE_MS)
    }
    const onVisibility = () => void this.syncNow()
    const onOnline = () => void this.syncNow()
    const onOffline = () => this.setStatus({ state: 'offline', error: null })
    const interval = setInterval(() => void this.syncNow(), INTERVAL_MS)
    this.cleanup = [
      onLocalChange(debounced),
      () => clearInterval(interval),
      () => document.removeEventListener('visibilitychange', onVisibility),
      () => window.removeEventListener('online', onOnline),
      () => window.removeEventListener('offline', onOffline),
    ]
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void this.syncNow()
  }

  stop(): void {
    for (const fn of this.cleanup) fn()
    this.cleanup = []
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  /** Synkronoi nyt. Jos synkronointi on jo käynnissä, ajetaan perään vielä yksi kierros. */
  async syncNow(): Promise<boolean> {
    if (this.running) {
      this.again = true
      await this.running
      return this.status.state === 'idle'
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setStatus({ state: 'offline', error: null })
      return false
    }
    this.running = (async () => {
      do {
        this.again = false
        this.setStatus({ state: 'syncing', error: null })
        try {
          await syncOnce(db, this.remote)
          this.setStatus({ state: 'idle', error: null })
        } catch (e) {
          console.error('Synkronointi epäonnistui', e)
          this.setStatus({ state: 'error', error: e instanceof Error ? e.message : String(e) })
          this.again = false
        }
      } while (this.again)
    })()
    try {
      await this.running
    } finally {
      this.running = null
    }
    return this.status.state === 'idle'
  }
}
