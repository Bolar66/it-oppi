import { Link } from 'react-router'
import { BookA, ChevronRight, Flame, Repeat } from 'lucide-react'
import { content, getPath } from '../content/loader.ts'
import type { PathIndex } from '../content/contentIndex.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress, usePathStatus, type ProgressSnapshot } from '../progress/hooks.ts'
import { dueCount } from '../progress/review.ts'
import { activeDays, xpOnDay } from '../progress/stats.ts'
import { computeStreaks } from '../progress/streak.ts'
import { computePathStatus, type PathStatus } from '../progress/unlocks.ts'
import { termCounts, unlockedTerms } from '../terms/session.ts'
import GoalRing from '../ui/GoalRing.tsx'
import { PathIcon, ProgressBar, SectionTitle } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { buttonClass, surface } from '../ui/styles.ts'

export default function Home() {
  const progress = useProgress()
  const today = dayKey(new Date())
  const path = (progress?.lastPathId && getPath(progress.lastPathId)) || content.paths[0]
  const status = usePathStatus(path, progress)

  const xpToday = progress ? xpOnDay(progress.xpEvents, today) : 0
  const goal = progress?.dailyGoal ?? 50
  const streak = progress ? computeStreaks(activeDays(progress.xpEvents), today).current : 0
  const due = progress ? dueCount(progress.reviewItems, today) : 0
  const terms = progress ? termCounts(unlockedTerms(content.paths, progress.completed), progress.termItems, today) : null
  const termsToPractice = terms ? terms.due + terms.fresh : 0
  const left = Math.max(0, goal - xpToday)

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl font-bold tracking-tight">IT-oppi</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${streak > 0 ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted'}`}
        >
          <Flame size={16} aria-hidden />
          <span>Putki {streak} pv</span>
        </span>
      </header>

      <section aria-labelledby="today-title" className={`${surface} flex items-center gap-4 p-4`}>
        <div className="relative">
          <GoalRing value={xpToday} max={goal} />
          <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold">
            {Math.round(Math.min(1, xpToday / goal) * 100)} %
          </span>
        </div>
        <div className="min-w-0">
          <h1 id="today-title" className="text-xl font-bold">
            Tänään
          </h1>
          <p className="font-display font-semibold tabular-nums">
            {xpToday} / {goal} XP
          </p>
          <p className="text-sm text-muted">
            {left === 0 ? 'Päivän tavoite saavutettu. Hyvää työtä!' : `Vielä ${left} XP päivän tavoitteeseen.`}
          </p>
        </div>
      </section>

      {path && status && <ContinueCard path={path} status={status} />}

      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/review" icon={Repeat} label="Kertaus" count={due} empty="Ei kerrattavaa" />
        <QuickLink to="/terms" icon={BookA} label="Termit" count={termsToPractice} empty="Ei uusia" />
      </div>

      <section aria-labelledby="paths-title">
        <SectionTitle>
          <span id="paths-title">Polut</span>
        </SectionTitle>
        <ul className={`${surface} divide-y divide-line overflow-hidden`}>
          {content.paths.map((p) => (
            <PathRow key={p.id} path={p} progress={progress} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function ContinueCard({ path, status }: { path: PathIndex; status: PathStatus }) {
  const next = status.next
  const started = status.completedUnits > 0
  let to = `/path/${path.id}`
  let title = 'Kaikki suoritettu'
  let detail = 'Polun kaikki tasot on suoritettu.'
  if (next.kind === 'unit') {
    const allUnits = status.levels.flatMap((l) => l.units)
    const n = allUnits.findIndex((u) => u.unitId === next.unitId) + 1
    to = `/lesson/${path.id}/${next.unitId}`
    title = path.units[next.unitId]?.title ?? next.unitId
    detail = `Yksikkö ${n} / ${allUnits.length}`
  } else if (next.kind === 'exam') {
    to = `/exam/${path.id}/${next.level}`
    title = `Tason ${next.level} koe`
    detail = 'Kaikki yksiköt suoritettu – koe on auki.'
  }

  return (
    <section aria-labelledby="continue-title" style={pathTone(path.id)} className={`path-tone ${surface} overflow-hidden`}>
      <div className="flex items-start gap-3 bg-path-soft/60 p-4">
        <PathIcon pathId={path.id} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-path-ink">{path.title}</p>
          <h2 id="continue-title" className="text-xl leading-snug font-bold">
            {title}
          </h2>
          <p className="text-sm text-muted">{detail}</p>
        </div>
      </div>
      <div className="space-y-3 p-4 pt-3">
        <ProgressBar value={status.completedUnits} max={status.totalUnits} label={`${path.title}: edistyminen`} tone="path" />
        <Link to={to} className={buttonClass('primary', 'lg')}>
          {started ? 'Jatka' : 'Aloita'}
        </Link>
      </div>
    </section>
  )
}

function QuickLink({
  to,
  icon: Icon,
  label,
  count,
  empty,
}: {
  to: string
  icon: typeof Repeat
  label: string
  count: number
  empty: string
}) {
  return (
    <Link
      to={to}
      aria-label={count > 0 ? `${label}: ${count}` : `${label}: ${empty}`}
      className={`${surface} flex items-center gap-3 p-3.5 hover:bg-surface-2`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${count > 0 ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted'}`}
      >
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="block truncate text-sm text-muted">{count > 0 ? `${count} odottaa` : empty}</span>
      </span>
    </Link>
  )
}

function PathRow({ path, progress }: { path: PathIndex; progress: ProgressSnapshot | undefined }) {
  const s = progress ? computePathStatus(path, progress.completed, progress.examResults) : undefined
  const total = s?.totalUnits ?? Object.keys(path.units).length
  const done = s?.completedUnits ?? 0
  return (
    <li style={pathTone(path.id)} className="path-tone">
      <Link to={`/path/${path.id}`} className="flex items-center gap-3 p-3.5 hover:bg-surface-2">
        <PathIcon pathId={path.id} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{path.title}</span>
            <span className="shrink-0 font-display text-sm text-muted tabular-nums">
              {done}/{total}
            </span>
          </div>
          <ProgressBar value={done} max={total} label={`${path.title}: suoritetut yksiköt`} tone="path" className="mt-2 h-1.5" />
        </div>
        <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden />
      </Link>
    </li>
  )
}
