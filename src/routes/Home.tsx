import { Link } from 'react-router'
import { content, getPath } from '../content/loader.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress, usePathStatus } from '../progress/hooks.ts'
import { dueCount } from '../progress/review.ts'
import { activeDays, xpOnDay } from '../progress/stats.ts'
import { computeStreaks } from '../progress/streak.ts'
import { computePathStatus } from '../progress/unlocks.ts'
import { termCounts, unlockedTerms } from '../terms/session.ts'

export default function Home() {
  const progress = useProgress()
  const today = dayKey(new Date())
  const path = (progress?.lastPathId && getPath(progress.lastPathId)) || content.paths[0]
  const status = usePathStatus(path, progress)

  const xpToday = progress ? xpOnDay(progress.xpEvents, today) : 0
  const goal = progress?.dailyGoal ?? 50
  const streak = progress ? computeStreaks(activeDays(progress.xpEvents), today).current : 0
  const due = progress ? dueCount(progress.reviewItems, today) : 0
  const goalDone = xpToday >= goal
  const terms = progress ? termCounts(unlockedTerms(content.paths, progress.completed), progress.termItems, today) : null
  const termsToPractice = terms ? terms.due + terms.fresh : 0

  let continueTo: { to: string; label: string } | null = null
  if (path && status) {
    const next = status.next
    if (next.kind === 'unit') {
      const unit = path.units[next.unitId]
      continueTo = { to: `/lesson/${path.id}/${next.unitId}`, label: unit ? unit.title : next.unitId }
    } else if (next.kind === 'exam') {
      continueTo = { to: `/exam/${path.id}/${next.level}`, label: `Tason ${next.level} koe` }
    } else {
      continueTo = { to: `/path/${path.id}`, label: `${path.title}: kaikki suoritettu` }
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">IT-oppi</h1>
        <p className="text-sm text-slate-400">Tietotekniikkaa perusteista syventäviin aiheisiin</p>
      </header>

      <section aria-label="Päivän tavoite" className="rounded-2xl bg-slate-800 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">{goalDone ? 'Päivän tavoite saavutettu! 🎯' : 'Päivän tavoite'}</span>
          <span className="text-sm text-slate-300">
            {xpToday} / {goal} XP
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Päivän XP"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(xpToday, goal)}
          className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(1, xpToday / goal) * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-900 p-2">
            <div className="text-lg font-bold">🔥 {streak} pv</div>
            <div className="text-xs text-slate-400">Putki</div>
          </div>
          <Link to="/review" className="rounded-xl bg-slate-900 p-2 active:bg-slate-700">
            <div className="text-lg font-bold">{due}</div>
            <div className="text-xs text-slate-400">Kerrattavaa</div>
          </Link>
          <Link to="/terms" className="rounded-xl bg-slate-900 p-2 active:bg-slate-700">
            <div className="text-lg font-bold">{termsToPractice}</div>
            <div className="text-xs text-slate-400">Termejä</div>
          </Link>
        </div>
      </section>

      {continueTo && (
        <Link
          to={continueTo.to}
          className="block rounded-2xl bg-accent-dark px-4 py-4 text-center text-white shadow active:translate-y-0.5"
        >
          <span className="block text-lg font-semibold">Jatka siitä mihin jäit</span>
          <span className="block text-sm opacity-90">{continueTo.label}</span>
        </Link>
      )}

      {due > 0 && (
        <Link to="/review" className="block rounded-2xl border-2 border-sky-600 px-4 py-3 text-center font-semibold text-sky-200">
          Kertaa {due} harjoitusta
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Polut</h2>
        <ul className="space-y-3">
          {content.paths.map((p) => {
            const s = progress ? computePathStatus(p, progress.completed, progress.examResults) : undefined
            return (
              <li key={p.id}>
                <Link
                  to={`/path/${p.id}`}
                  className="block rounded-xl border border-slate-700 bg-slate-800 p-4 active:bg-slate-700"
                >
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-slate-400">{p.description}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${s && s.totalUnits ? (s.completedUnits / s.totalUnits) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {s ? `${s.completedUnits}/${s.totalUnits} yksikköä · taso ${s.highestUnlocked}` : `${Object.keys(p.units).length} yksikköä`}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
