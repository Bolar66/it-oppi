import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { content, getUnit } from '../content/loader.ts'
import { db } from '../progress/db.ts'
import { dayKey, parseDayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { activeDays, weakestUnits, xpByDay } from '../progress/stats.ts'
import { computeStreaks } from '../progress/streak.ts'
import { computePathStatus } from '../progress/unlocks.ts'

const weekday = (key: string) => parseDayKey(key).toLocaleDateString('fi-FI', { weekday: 'short' }).slice(0, 2)

export default function Stats() {
  const progress = useProgress()
  const attempts = useLiveQuery(() => db.attempts.toArray(), [])
  const today = dayKey(new Date())

  if (!progress || !attempts) return <p className="text-slate-400">Ladataan…</p>

  const totalXp = progress.xpEvents.reduce((s, e) => s + e.amount, 0)
  const streaks = computeStreaks(activeDays(progress.xpEvents), today)
  const history = xpByDay(progress.xpEvents, today, 14)
  const maxDay = Math.max(progress.dailyGoal, ...history.map((d) => d.xp))
  const weak = weakestUnits(attempts)
  const started = content.paths
    .map((p) => ({ path: p, status: computePathStatus(p, progress.completed, progress.examResults) }))
    .filter(({ path, status }) => status.completedUnits > 0 || progress.examResults.some((e) => e.pathId === path.id))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tilastot</h1>

      <section aria-label="Yhteenveto" className="grid grid-cols-3 gap-3 text-center">
        <Tile value={String(totalXp)} label="XP yhteensä" />
        <Tile value={`${streaks.current} pv`} label="Putki" />
        <Tile value={`${streaks.longest} pv`} label="Pisin putki" />
      </section>

      <section aria-labelledby="xp-history">
        <h2 id="xp-history" className="mb-3 text-lg font-semibold">
          XP – 14 päivää
        </h2>
        <div className="flex h-40 items-end gap-1 rounded-xl bg-slate-800 p-3 pt-6">
          {history.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div
                title={`${d.date}: ${d.xp} XP`}
                aria-label={`${d.date}: ${d.xp} XP`}
                className={`w-full rounded-t ${d.xp >= progress.dailyGoal ? 'bg-accent' : 'bg-sky-600'} ${d.date === today ? 'ring-2 ring-white/40' : ''}`}
                style={{ height: `${(d.xp / maxDay) * 100}%`, minHeight: d.xp > 0 ? 3 : 0 }}
              />
              <span className="text-[10px] text-slate-500">{weekday(d.date)}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Vihreä = päivätavoite ({progress.dailyGoal} XP) saavutettu.</p>
      </section>

      <section aria-labelledby="per-path">
        <h2 id="per-path" className="mb-3 text-lg font-semibold">
          Osaaminen poluittain
        </h2>
        {started.length === 0 ? (
          <p className="text-sm text-slate-400">Suorita ensimmäinen yksikkö, niin edistymisesi näkyy täällä.</p>
        ) : (
          <ul className="space-y-3">
            {started.map(({ path, status }) => (
              <li key={path.id} className="rounded-xl bg-slate-800 p-3">
                <div className="flex justify-between text-sm">
                  <Link to={`/path/${path.id}`} className="font-semibold">
                    {path.title}
                  </Link>
                  <span className="text-slate-400">
                    {status.completedUnits}/{status.totalUnits} · taso {status.highestUnlocked}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full bg-accent" style={{ width: `${(status.completedUnits / status.totalUnits) * 100}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {status.levels
                    .filter((l) => l.exam.best !== null || l.exam.passed)
                    .map((l) => (
                      <span key={l.level} className={`rounded px-2 py-0.5 ${l.exam.passed ? 'bg-green-900 text-green-200' : 'bg-slate-700'}`}>
                        Koe {l.level}: {l.exam.best !== null ? `${Math.round(l.exam.best * 100)} %` : 'tasotesti ✓'}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="weakest">
        <h2 id="weakest" className="mb-3 text-lg font-semibold">
          Heikoimmat aiheet
        </h2>
        {weak.length === 0 ? (
          <p className="text-sm text-slate-400">Ei vielä tarpeeksi vastauksia (vähintään 5 per yksikkö).</p>
        ) : (
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w.unitId}>
                <Link
                  to={`/lesson/${w.pathId}/${w.unitId}`}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 active:bg-slate-700"
                >
                  <span className="text-sm">{getUnit(w.pathId, w.unitId)?.title ?? w.unitId}</span>
                  <span className="text-sm text-rose-300">{Math.round(w.accuracy * 100)} % oikein</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-800 p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
