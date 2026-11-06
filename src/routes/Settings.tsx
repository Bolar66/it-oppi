import { useState } from 'react'
import { loadReports, removeReport } from '../reports/errorReports.ts'

export default function Settings() {
  const [reports, setReports] = useState(loadReports)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Asetukset</h1>

      <section aria-labelledby="reports-title">
        <h2 id="reports-title" className="mb-2 text-lg font-semibold">
          Virheilmoitukset ({reports.length})
        </h2>
        {reports.length === 0 ? (
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
                    onClick={() => setReports(removeReport(r.id))}
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

      <p className="text-sm text-slate-400">Synkronointi sekä datan vienti ja tuonti tulevat myöhemmissä vaiheissa.</p>
    </div>
  )
}
