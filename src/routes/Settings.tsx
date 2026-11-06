import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { db } from '../progress/db.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { exportData, importData, parseExport, removeReport, setDailyGoal } from '../progress/repo.ts'
import type { ExportFile } from '../progress/types.ts'
import { DAILY_GOAL_OPTIONS } from '../progress/xp.ts'

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
      <h1 className="text-2xl font-bold">Asetukset</h1>

      <section aria-labelledby="goal-title">
        <h2 id="goal-title" className="mb-2 text-lg font-semibold">
          Päivätavoite
        </h2>
        <div role="radiogroup" aria-labelledby="goal-title" className="grid grid-cols-3 gap-2">
          {DAILY_GOAL_OPTIONS.map((xp) => {
            const selected = progress?.dailyGoal === xp
            return (
              <button
                key={xp}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void setDailyGoal(xp)}
                className={`min-h-11 rounded-xl border-2 py-2 font-semibold ${selected ? 'border-accent bg-green-950 text-green-200' : 'border-slate-700 bg-slate-800'}`}
              >
                {xp} XP
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="data-title" className="space-y-3">
        <h2 id="data-title" className="text-lg font-semibold">
          Data
        </h2>
        <p className="text-sm text-slate-400">
          Edistyminen tallentuu tähän laitteeseen. Vie se tiedostoon varmuuskopioksi tai siirtääksesi toiseen laitteeseen.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void doExport()} className="min-h-11 rounded-xl bg-slate-700 py-2 font-semibold">
            Vie JSON
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="min-h-11 rounded-xl bg-slate-700 py-2 font-semibold"
          >
            Tuo JSON
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
          <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-green-300' : 'text-rose-400'}`}>
            {message.text}
          </p>
        )}
      </section>

      <section aria-labelledby="reports-title">
        <h2 id="reports-title" className="mb-2 text-lg font-semibold">
          Virheilmoitukset ({reports?.length ?? 0})
        </h2>
        {!reports || reports.length === 0 ? (
          <p className="text-sm text-slate-400">Ei ilmoituksia. Voit ilmoittaa virheestä jokaisessa harjoituksessa.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-slate-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-400">
                      {r.unitId}/{r.exerciseId} · {new Date(r.createdAt).toLocaleDateString('fi-FI')}
                    </div>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap">{r.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeReport(r.id)}
                    aria-label={`Poista ilmoitus ${r.unitId}/${r.exerciseId}`}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm text-rose-300 active:bg-slate-700"
                  >
                    Poista
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-slate-400">Synkronointi laitteiden välillä tulee vaiheessa 5.</p>

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
          <p className="mt-2 text-rose-300">Kaikki tämän laitteen nykyinen data korvataan.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
