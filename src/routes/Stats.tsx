import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { ChartColumn, ChevronRight, Route, Target, BookA } from 'lucide-react'
import { content, getUnitMeta } from '../content/loader.ts'
import { db } from '../progress/db.ts'
import { dayKey, parseDayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { activeDays, weakestUnits, xpByDay } from '../progress/stats.ts'
import { computeStreaks } from '../progress/streak.ts'
import { computePathStatus } from '../progress/unlocks.ts'
import { termCounts, unlockedTerms } from '../terms/session.ts'
import { EmptyState, PageHeader, PathIcon, ProgressBar, SectionTitle } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { surface } from '../ui/styles.ts'

const weekday = (key: string) => parseDayKey(key).toLocaleDateString('fi-FI', { weekday: 'short' }).slice(0, 2)

export default function Stats() {
  const progress = useProgress()
  const attempts = useLiveQuery(() => db.attempts.toArray(), [])
  const today = dayKey(new Date())

  if (!progress || !attempts) return <p className="text-muted">Ladataan…</p>

  const totalXp = progress.xpEvents.reduce((s, e) => s + e.amount, 0)
  const streaks = computeStreaks(activeDays(progress.xpEvents), today)
  const history = xpByDay(progress.xpEvents, today, 14)
  const goal = progress.dailyGoal
  const maxDay = Math.max(goal, ...history.map((d) => d.xp))
  const weak = weakestUnits(attempts)
  const termRows = content.paths
    .map((p) => ({ path: p, ...termCounts(unlockedTerms(content.paths, progress.completed, p.id), progress.termItems, today) }))
    .filter((t) => t.unlocked > 0)
  const started = content.paths
    .map((p) => ({ path: p, status: computePathStatus(p, progress.completed, progress.examResults) }))
    .filter(({ path, status }) => status.completedUnits > 0 || progress.examResults.some((e) => e.pathId === path.id))

  return (
    <div className="space-y-8">
      <PageHeader title="Tilastot" />

      <dl aria-label="Yhteenveto" className={`${surface} grid grid-cols-3 divide-x divide-line text-center`}>
        <Stat value={String(totalXp)} label="XP yhteensä" />
        <Stat value={`${streaks.current} pv`} label="Putki" />
        <Stat value={`${streaks.longest} pv`} label="Pisin putki" />
      </dl>

      <section aria-labelledby="xp-history">
        <SectionTitle aside={`Tavoite ${goal} XP`}>
          <span id="xp-history">XP, 14 päivää</span>
        </SectionTitle>
        <div className={`${surface} p-4`}>
          <div className="relative flex h-32 items-end gap-1">
            <span
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-faint"
              style={{ bottom: `${(goal / maxDay) * 100}%` }}
            />
            {history.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.xp} XP`}
                aria-label={`${d.date}: ${d.xp} XP`}
                className={`relative flex-1 rounded-t-md ${d.xp >= goal ? 'bg-good' : 'bg-primary'} ${d.xp === 0 ? 'opacity-0' : ''}`}
                style={{ height: `${(d.xp / maxDay) * 100}%`, minHeight: d.xp > 0 ? 4 : 0 }}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-1 border-t border-line pt-1.5">
            {history.map((d) => (
              <span
                key={d.date}
                className={`flex-1 text-center text-[10px] ${d.date === today ? 'font-bold text-ink' : 'text-faint'}`}
              >
                {weekday(d.date)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Vihreä pylväs = päivän tavoite saavutettu. Katkoviiva näyttää tavoitteen.
          </p>
        </div>
      </section>

      <section aria-labelledby="per-path">
        <SectionTitle>
          <span id="per-path">Osaaminen poluittain</span>
        </SectionTitle>
        {started.length === 0 ? (
          <EmptyState icon={Route} title="Ei vielä suorituksia">
            Suorita ensimmäinen yksikkö, niin edistymisesi näkyy täällä.
          </EmptyState>
        ) : (
          <ul className={`${surface} divide-y divide-line overflow-hidden`}>
            {started.map(({ path, status }) => (
              <li key={path.id} style={pathTone(path.id)} className="path-tone">
                <Link to={`/path/${path.id}`} className="flex items-center gap-3 p-3.5 hover:bg-surface-2">
                  <PathIcon pathId={path.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{path.title}</span>
                      <span className="shrink-0 font-display text-sm text-muted tabular-nums">
                        {status.completedUnits}/{status.totalUnits}
                      </span>
                    </div>
                    <ProgressBar
                      value={status.completedUnits}
                      max={status.totalUnits}
                      label={`${path.title}: suoritetut yksiköt`}
                      tone="path"
                      className="mt-2 h-1.5"
                    />
                    {status.levels.some((l) => l.exam.best !== null || l.exam.passed) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {status.levels
                          .filter((l) => l.exam.best !== null || l.exam.passed)
                          .map((l) => (
                            <span
                              key={l.level}
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.exam.passed ? 'bg-good-soft text-good' : 'bg-surface-2 text-muted'}`}
                            >
                              Koe {l.level}: {l.exam.best !== null ? `${Math.round(l.exam.best * 100)} %` : 'tasotesti läpi'}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="terms-title">
        <SectionTitle>
          <span id="terms-title">Termit</span>
        </SectionTitle>
        {termRows.length === 0 ? (
          <EmptyState icon={BookA} title="Ei vielä avattuja termejä">
            Termit avautuvat, kun suoritat yksiköitä.
          </EmptyState>
        ) : (
          <ul className={`${surface} divide-y divide-line`}>
            {termRows.map((t) => (
              <li key={t.path.id} style={pathTone(t.path.id)} className="path-tone p-3.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{t.path.title}</span>
                  <span className="text-muted">
                    {t.learned} opittu, {t.unlocked} avattu
                  </span>
                </div>
                <ProgressBar value={t.learned} max={t.unlocked} label={`${t.path.title}: opitut termit`} tone="path" className="mt-2 h-1.5" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="weakest">
        <SectionTitle>
          <span id="weakest">Heikoimmat aiheet</span>
        </SectionTitle>
        {weak.length === 0 ? (
          <EmptyState icon={Target} title="Ei vielä tarpeeksi vastauksia">
            Aihe näkyy täällä, kun siitä on vähintään 5 vastausta.
          </EmptyState>
        ) : (
          <ul className={`${surface} divide-y divide-line overflow-hidden`}>
            {weak.map((w) => (
              <li key={w.unitId} style={pathTone(w.pathId)} className="path-tone">
                <Link to={`/lesson/${w.pathId}/${w.unitId}`} className="flex items-center gap-3 p-3.5 hover:bg-surface-2">
                  <PathIcon pathId={w.pathId} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{getUnitMeta(w.pathId, w.unitId)?.title ?? w.unitId}</span>
                  <span className="shrink-0 font-display text-sm font-semibold text-bad tabular-nums">
                    {Math.round(w.accuracy * 100)} %
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-xs text-faint">
        <ChartColumn size={14} aria-hidden /> Tilastot lasketaan tämän laitteen tiedoista.
      </p>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-3">
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  )
}
