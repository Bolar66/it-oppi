import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getPath } from '../content/loader.ts'
import { useUnit } from '../content/useUnit.ts'
import Theory from '../components/Theory.tsx'
import LessonRunner from '../lesson/LessonRunner.tsx'
import { useProgress, usePathStatus } from '../progress/hooks.ts'
import { recordLesson } from '../progress/repo.ts'
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <Link to={`/path/${pathId}`} aria-label="Sulje oppitunti" className="text-2xl text-slate-400">
          ✕
        </Link>
        <div className="text-xs text-slate-400">
          {path.title} · Taso {meta.level}
          {unitStatus === 'completed' && ' · ✓ suoritettu'}
        </div>
      </header>

      <h1 className="mt-3 text-2xl font-bold">{meta.title}</h1>

      {unitStatus === 'locked' ? (
        <div className="mt-6 flex-1 space-y-4">
          <p className="rounded-xl bg-slate-800 p-4 text-slate-300">
            🔒 Tämä yksikkö on vielä lukittu. Suorita ensin edelliset yksiköt (tai tason koe).
          </p>
          <Link to={`/path/${pathId}`} className="inline-block text-accent underline">
            Polkukarttaan
          </Link>
        </div>
      ) : loaded.status === 'error' ? (
        <p role="alert" className="mt-6 rounded-xl bg-rose-950 p-4 text-rose-200">
          Yksikön lataus epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.
        </p>
      ) : (
        <>
          <div className="flex-1">
            {unit ? <Theory markdown={unit.theory} /> : <p className="mt-6 text-slate-400">Ladataan…</p>}
          </div>
          <div className="sticky bottom-0 mt-6 bg-slate-900 pt-3">
            <button
              type="button"
              disabled={!status || !unit}
              onClick={() => setRun(1)}
              className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white active:translate-y-0.5 disabled:opacity-60"
            >
              Aloita harjoitukset ({meta.exerciseCount})
            </button>
          </div>
        </>
      )}
    </div>
  )
}
