import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getUnit } from '../content/loader.ts'
import Theory from '../components/Theory.tsx'
import LessonRunner from '../lesson/LessonRunner.tsx'
import NotFound from './NotFound.tsx'

export default function Lesson() {
  const { pathId = '', unitId = '' } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(0) // 0 = teoria, >0 = harjoituskierroksen numero
  const unit = getUnit(pathId, unitId)

  if (!unit) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <NotFound />
      </div>
    )
  }

  if (run > 0) {
    return (
      <LessonRunner
        key={run}
        pathId={pathId}
        unit={unit}
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
        <div className="text-xs text-slate-400">Taso {unit.level}</div>
      </header>

      <h1 className="mt-3 text-2xl font-bold">{unit.title}</h1>
      <div className="flex-1">
        <Theory markdown={unit.theory} />
      </div>

      <div className="sticky bottom-0 mt-6 bg-slate-900 pt-3">
        <button
          type="button"
          onClick={() => setRun(1)}
          className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white active:translate-y-0.5"
        >
          Aloita harjoitukset ({unit.exercises.length})
        </button>
      </div>
    </div>
  )
}
