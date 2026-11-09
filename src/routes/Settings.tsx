import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { db } from '../progress/db.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { exportData, importData, parseExport, removeReport, setDailyGoal } from '../progress/repo.ts'
import type { ExportFile } from '../progress/types.ts'
import { DAILY_GOAL_OPTIONS } from '../progress/xp.ts'
import { Download, Flag, Trash2, Upload } from 'lucide-react'
import { EmptyState, PageHeader, SectionTitle } from '../ui/components.tsx'
import { buttonClass, surface } from '../ui/styles.ts'

export default function Settings() {
  const progress = useProgress()
  const reports = useLiveQuery(() => db.errorReports.orderBy('createdAt').reverse().toArray(), [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ExportFile | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const doExport = async () => {
    const file = await exportData()
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `it-oppi-${dayKey(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Data viety tiedostoon.' })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const r = parseExport(await file.text())
    if (fileInput.current) fileInput.current.value = ''
    if (!r.ok) return setMessage({ kind: 'error', text: r.error })
    setPending(r.file)
  }

  const confirmImport = async () => {
    if (!pending) return
    try {
      await importData(pending)
      setMessage({ kind: 'ok', text: 'Data tuotu.' })
    } catch (e) {
      console.error(e)
      setMessage({ kind: 'error', text: 'Tuonti epäonnistui. Nykyinen data säilyi ennallaan.' })
    }
    setPending(null)
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Asetukset" />

      <section aria-labelledby="goal-title">
        <SectionTitle>
          <span id="goal-title">Päivätavoite</span>
        </SectionTitle>
        <div role="radiogroup" aria-labelledby="goal-title" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
          {DAILY_GOAL_OPTIONS.map((xp) => {
            const selected = progress?.dailyGoal === xp
            return (
              <button
                key={xp}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void setDailyGoal(xp)}
                className={`min-h-11 rounded-xl font-display font-semibold transition-colors ${selected ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {xp} XP
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm text-muted">Oppitunnin oikea vastaus antaa 10 XP, termi 5 XP.</p>
      </section>

      <section aria-labelledby="data-title">
        <SectionTitle>
          <span id="data-title">Varmuuskopio</span>
        </SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Edistyminen tallentuu tähän laitteeseen. Vie se tiedostoon varmuuskopioksi tai siirtääksesi toiseen laitteeseen.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void doExport()} className={buttonClass('secondary', 'md')}>
            <Download size={18} aria-hidden />
            Vie tiedostoon
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className={buttonClass('secondary', 'md')}>
            <Upload size={18} aria-hidden />
            Tuo tiedostosta
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Tuotava tiedosto"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {message && (
          <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-good' : 'text-bad'}`}>
            {message.text}
          </p>
        )}
      </section>

      <section aria-labelledby="reports-title">
        <SectionTitle aside={reports && reports.length > 0 ? `${reports.length} kpl` : undefined}>
          <span id="reports-title">Virheilmoitukset</span>
        </SectionTitle>
        {!reports || reports.length === 0 ? (
          <EmptyState icon={Flag} title="Ei ilmoituksia">
            Voit ilmoittaa virheestä jokaisessa harjoituksessa.
          </EmptyState>
        ) : (
          <ul className={`${surface} divide-y divide-line`}>
            {reports.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="text-xs text-muted">
                    <span className="font-mono">
                      {r.unitId}/{r.exerciseId}
                    </span>
                    , {new Date(r.createdAt).toLocaleDateString('fi-FI')}
                  </div>
                  <p className="mt-1 text-[0.95rem] break-words whitespace-pre-wrap">{r.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeReport(r.id)}
                  aria-label={`Poista ilmoitus ${r.unitId}/${r.exerciseId}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bad-soft hover:text-bad"
                >
                  <Trash2 size={17} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-sm text-faint">Synkronointi laitteiden välillä tulee myöhemmin.</p>

      {pending && (
        <ConfirmDialog
          title="Korvataanko nykyinen data?"
          confirmLabel="Korvaa"
          onCancel={() => setPending(null)}
          onConfirm={() => void confirmImport()}
        >
          <p>
            Tiedosto on viety {new Date(pending.exportedAt).toLocaleString('fi-FI')}. Siinä on{' '}
            {pending.data.xpEvents.reduce((s, e) => s + e.amount, 0)} XP,{' '}
            {pending.data.unitProgress.filter((u) => u.completedAt).length} suoritettua yksikköä ja{' '}
            {pending.data.reviewItems.length} kertausharjoitusta.
          </p>
          <p className="mt-2 text-bad">Kaikki tämän laitteen nykyinen data korvataan.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
