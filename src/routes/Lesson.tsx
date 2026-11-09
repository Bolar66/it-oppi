import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getPath } from '../content/loader.ts'
import { useUnit } from '../content/useUnit.ts'
import Theory from '../components/Theory.tsx'
import LessonRunner from '../lesson/LessonRunner.tsx'
import { useProgress, usePathStatus } from '../progress/hooks.ts'
import { recordLesson } from '../progress/repo.ts'
import { Check, Lock, X } from 'lucide-react'
import { ActionBar, EmptyState, PathIcon } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { buttonClass } from '../ui/styles.ts'
import NotFound from './NotFound.tsx'

export default function Lesson() {
  const { pathId = '', unitId = '' } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(0) // 0 = teoria, >0 = harjoituskierroksen numero
  const path = getPath(pathId)
  const meta = path?.units[unitId]
  const loaded = useUnit(pathId, unitId)
  const unit = loaded.status === 'ready' ? loaded.unit : undefined
  const progress = useProgress()
  const status = usePathStatus(path, progress)
  const items = useMemo(() => unit?.exercises.map((exercise) => ({ pathId, unitId, exercise })) ?? [], [unit, pathId, unitId])

  if (!path || !meta) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <NotFound />
      </div>
    )
  }

  const unitStatus = status?.levels.flatMap((l) => l.units).find((u) => u.unitId === unitId)?.status

  if (run > 0 && unit) {
    return (
      <LessonRunner
        key={run}
        mode="lesson"
        items={items}
        theoryFor={() => ({ title: unit.title, theory: unit.theory })}
        onFinish={recordLesson}
        onExit={() => navigate(`/path/${pathId}`)}
        onRestart={() => setRun((r) => r + 1)}
      />
    )
  }

  const allUnits = status?.levels.flatMap((l) => l.units) ?? []
  const n = allUnits.findIndex((u) => u.unitId === unitId) + 1

  return (
    <div style={pathTone(pathId)} className="path-tone flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          to={`/path/${pathId}`}
          aria-label="Sulje oppitunti"
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X size={22} aria-hidden />
        </Link>

        <header className="mt-2 mb-2 flex items-start gap-3">
          <PathIcon pathId={pathId} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-path-ink">
              {path.title}
              {n > 0 && `, yksikkö ${n}/${allUnits.length}`}
            </p>
            <h1 className="text-[1.75rem] leading-tight font-bold">{meta.title}</h1>
            {unitStatus === 'completed' && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-good">
                <Check size={16} aria-hidden /> Suoritettu
              </p>
            )}
          </div>
        </header>

        {unitStatus === 'locked' ? (
          <div className="mt-6">
            <EmptyState icon={Lock} title="Tämä yksikkö on vielä lukittu">
              Suorita ensin edelliset yksiköt tai tason koe.
            </EmptyState>
            <Link to={`/path/${pathId}`} className={buttonClass('secondary', 'md', 'mt-4 w-full')}>
              Polkukarttaan
            </Link>
          </div>
        ) : loaded.status === 'error' ? (
          <p role="alert" className="mt-6 rounded-2xl bg-bad-soft p-4 text-bad">
            Yksikköä ei saatu ladattua. Tarkista verkkoyhteys ja yritä uudelleen.
          </p>
        ) : unit ? (
          <Theory markdown={unit.theory} />
        ) : (
          <p className="mt-6 text-muted">Ladataan…</p>
        )}
      </div>

      {unitStatus !== 'locked' && loaded.status !== 'error' && (
        <ActionBar>
          <button type="button" disabled={!status || !unit} onClick={() => setRun(1)} className={buttonClass('primary')}>
            Aloita harjoitukset ({meta.exerciseCount})
          </button>
        </ActionBar>
      )}
    </div>
  )
}
