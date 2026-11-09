import { Link, useParams } from 'react-router'
import { Check, GraduationCap, Lock, Trophy } from 'lucide-react'
import { getPath } from '../content/loader.ts'
import type { UnitMeta } from '../content/contentIndex.ts'
import { useProgress, usePathStatus } from '../progress/hooks.ts'
import type { LevelStatus, UnitStatus } from '../progress/unlocks.ts'
import { PageHeader, PathIcon, ProgressBar } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { buttonClass, surface } from '../ui/styles.ts'
import NotFound from './NotFound.tsx'

const pct = (x: number) => `${Math.round(x * 100)} %`

export default function PathMap() {
  const { pathId = '' } = useParams()
  const path = getPath(pathId)
  const progress = useProgress()
  const status = usePathStatus(path, progress)
  if (!path) return <NotFound />

  return (
    <div style={pathTone(path.id)} className="path-tone">
      <PageHeader title={path.title} back={{ to: '/', label: 'Koti' }} subtitle={path.description} />

      {status && (
        <div className={`${surface} mb-6 flex items-center gap-4 p-4`}>
          <PathIcon pathId={path.id} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {status.completedUnits} / {status.totalUnits} yksikköä suoritettu
            </p>
            <ProgressBar
              value={status.completedUnits}
              max={status.totalUnits}
              label={`${path.title}: edistyminen`}
              tone="path"
              className="mt-2"
            />
          </div>
        </div>
      )}

      {status?.placementAvailable && (
        <div className={`${surface} mb-8 flex items-start gap-3 p-4`}>
          <GraduationCap size={22} className="mt-0.5 shrink-0 text-path" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Osaatko jo perusteet?</p>
            <p className="text-sm text-muted">
              Läpäise tasotesti ({pct(path.placementTest.passThreshold)}), niin taso 1 merkitään suoritetuksi.
            </p>
            <Link to={`/placement/${path.id}`} className={buttonClass('secondary', 'sm', 'mt-3')}>
              Tee tasotesti
            </Link>
          </div>
        </div>
      )}

      {status?.levels.map((lvl) => (
        <LevelSection key={lvl.level} pathId={path.id} lvl={lvl} units={path.units} />
      ))}
    </div>
  )
}

function LevelSection({ pathId, lvl, units }: { pathId: string; lvl: LevelStatus; units: Record<string, UnitMeta> }) {
  const nextOpen = lvl.units.find((u) => u.status === 'open')?.unitId
  return (
    <section aria-label={`Taso ${lvl.level}`} className="mb-10">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
        {!lvl.unlocked && <Lock size={18} className="text-faint" aria-hidden />}
        Taso {lvl.level}: {lvl.title}
      </h2>
      {!lvl.unlocked && (
        <p className="mb-4 text-sm text-muted">
          Avautuu, kun tason {lvl.level - 1} koe on läpäisty (vähintään {pct(lvl.exam.passThreshold)}).
        </p>
      )}

      <ol className="relative mt-4">
        <span aria-hidden className="absolute top-6 bottom-6 left-[1.375rem] w-0.5 rounded bg-line" />
        {lvl.units.map(({ unitId, status }, i) => (
          <UnitRow
            key={unitId}
            pathId={pathId}
            unitId={unitId}
            n={i + 1}
            title={units[unitId]?.title ?? unitId}
            exercises={units[unitId]?.exerciseCount ?? 0}
            status={status}
            current={unitId === nextOpen}
          />
        ))}
        <ExamRow pathId={pathId} lvl={lvl} />
      </ol>
    </section>
  )
}

function Node({ status, n }: { status: UnitStatus; n: number }) {
  const cls = {
    completed: 'bg-path text-white dark:text-bg',
    open: 'bg-surface text-path ring-2 ring-path',
    locked: 'bg-surface-2 text-faint',
  }[status]
  return (
    <span
      aria-hidden
      className={`relative z-[1] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ${cls}`}
    >
      {status === 'completed' ? <Check size={20} strokeWidth={3} /> : status === 'locked' ? <Lock size={17} /> : n}
    </span>
  )
}

function UnitRow({
  pathId,
  unitId,
  n,
  title,
  exercises,
  status,
  current,
}: {
  pathId: string
  unitId: string
  n: number
  title: string
  exercises: number
  status: UnitStatus
  current: boolean
}) {
  const sub = status === 'completed' ? 'Suoritettu' : status === 'locked' ? 'Lukittu' : `${exercises} harjoitusta`
  const body = (
    <>
      <Node status={status} n={n} />
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${status === 'locked' ? 'text-muted' : ''}`}>{title}</span>
        <span className={`block text-sm ${current ? 'text-path-ink' : 'text-muted'}`}>{current ? 'Seuraavaksi' : sub}</span>
      </span>
    </>
  )
  if (status === 'locked') {
    return (
      <li className="flex items-center gap-4 py-2.5" aria-label={`${title} (lukittu)`}>
        {body}
      </li>
    )
  }
  return (
    <li className="py-1">
      <Link
        to={`/lesson/${pathId}/${unitId}`}
        aria-label={status === 'completed' ? `${title} (suoritettu)` : title}
        className={`-mx-2 flex items-center gap-4 rounded-2xl px-2 py-1.5 ${current ? 'bg-path-soft/70 hover:bg-path-soft' : 'hover:bg-surface-2'}`}
      >
        {body}
      </Link>
    </li>
  )
}

function ExamRow({ pathId, lvl }: { pathId: string; lvl: LevelStatus }) {
  const { exam } = lvl
  const icon = (
    <span
      aria-hidden
      className={`relative z-[1] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${exam.passed ? 'bg-good text-white dark:text-bg' : exam.available ? 'bg-primary text-on-primary' : 'bg-surface-2 text-faint'}`}
    >
      <Trophy size={19} />
    </span>
  )
  if (exam.passed) {
    return (
      <li className="flex items-center gap-4 py-2.5">
        {icon}
        <span>
          <span className="block font-semibold">Tason {lvl.level} koe läpäisty</span>
          {exam.best !== null && <span className="block text-sm text-muted">Paras tulos {pct(exam.best)}</span>}
        </span>
      </li>
    )
  }
  if (exam.available) {
    return (
      <li className="py-1">
        <Link to={`/exam/${pathId}/${lvl.level}`} className="-mx-2 flex items-center gap-4 rounded-2xl bg-primary-soft px-2 py-1.5">
          {icon}
          <span>
            <span className="block font-semibold">Tason {lvl.level} koe</span>
            <span className="block text-sm text-muted">
              {exam.best !== null ? `Paras tähän asti ${pct(exam.best)}` : `${exam.questionCount} kysymystä, raja ${pct(exam.passThreshold)}`}
            </span>
          </span>
        </Link>
      </li>
    )
  }
  return (
    <li className="flex items-center gap-4 py-2.5">
      {icon}
      <span>
        <span className="block font-semibold text-muted">Tason {lvl.level} koe</span>
        <span className="block text-sm text-muted">Aukeaa, kun kaikki yksiköt on suoritettu.</span>
      </span>
    </li>
  )
}
