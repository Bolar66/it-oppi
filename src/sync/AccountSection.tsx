import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CloudCheck, CloudOff, LoaderCircle, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { db } from '../progress/db.ts'
import { SectionTitle } from '../ui/components.tsx'
import { buttonClass, surface } from '../ui/styles.ts'
import { SignOutSyncError, useAuth } from './auth.tsx'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  const time = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
  return today ? `tänään klo ${time}` : `${d.toLocaleDateString('fi-FI')} klo ${time}`
}

/** Tili: kirjautunut osoite, synkronoinnin tila ja uloskirjautuminen. Näkyy vain kirjautuneelle. */
export default function AccountSection() {
  const { status, sync, syncNow, signOut } = useAuth()
  const lastSyncedAt = useLiveQuery(async () => (await db.syncMeta.get('lastSyncedAt'))?.value ?? null, [])
  const [dialog, setDialog] = useState<'confirm' | 'force' | null>(null)
  const [busy, setBusy] = useState(false)

  if (status.kind !== 'signedIn') return null

  const doSignOut = async (force: boolean) => {
    setBusy(true)
    try {
      await signOut(force)
    } catch (e) {
      if (e instanceof SignOutSyncError) setDialog('force')
      else console.error(e)
      setBusy(false)
    }
  }

  const syncing = sync.state === 'syncing'
  const line =
    sync.state === 'syncing'
      ? { icon: LoaderCircle, spin: true, text: 'Synkronoidaan…', tone: 'text-muted' }
      : sync.state === 'offline'
        ? { icon: CloudOff, spin: false, text: 'Ei verkkoyhteyttä. Muutokset synkronoidaan, kun yhteys palaa.', tone: 'text-muted' }
        : sync.state === 'error'
          ? { icon: TriangleAlert, spin: false, text: 'Synkronointi epäonnistui. Yritetään myöhemmin uudelleen.', tone: 'text-bad' }
          : {
              icon: CloudCheck,
              spin: false,
              text: lastSyncedAt ? `Synkronoitu ${formatTime(lastSyncedAt)}` : 'Ei vielä synkronoitu',
              tone: 'text-muted',
            }
  const Icon = line.icon

  return (
    <section aria-labelledby="account-title">
      <SectionTitle>
        <span id="account-title">Tili</span>
      </SectionTitle>
      <div className={`${surface} p-4`}>
        <p className="text-sm text-muted">Kirjautunut</p>
        <p className="font-semibold break-all">{status.email}</p>
        <p role="status" className={`mt-3 flex items-start gap-2 text-sm ${line.tone}`}>
          <Icon size={17} className={`mt-0.5 shrink-0 ${line.spin ? 'animate-spin' : ''}`} aria-hidden />
          {line.text}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" disabled={syncing} onClick={() => void syncNow()} className={buttonClass('secondary', 'md')}>
            <RefreshCw size={18} aria-hidden />
            Synkronoi nyt
          </button>
          <button type="button" disabled={busy} onClick={() => setDialog('confirm')} className={buttonClass('secondary', 'md')}>
            <LogOut size={18} aria-hidden />
            Kirjaudu ulos
          </button>
        </div>
      </div>

      {dialog === 'confirm' && (
        <ConfirmDialog
          title="Kirjaudutaanko ulos?"
          confirmLabel="Kirjaudu ulos"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null)
            void doSignOut(false)
          }}
        >
          <p>Edistymisesi synkronoidaan tilillesi ja poistetaan sitten tästä laitteesta. Saat sen takaisin kirjautumalla sisään.</p>
        </ConfirmDialog>
      )}
      {dialog === 'force' && (
        <ConfirmDialog
          title="Synkronointi ei onnistunut"
          confirmLabel="Kirjaudu ulos silti"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null)
            void doSignOut(true)
          }}
        >
          <p>Viimeisimmät muutokset eivät ole vielä tililläsi. Jos kirjaudut ulos nyt, ne menetetään.</p>
          <p className="mt-2">Tarkista verkkoyhteys ja yritä uudelleen, tai kirjaudu ulos silti.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}
