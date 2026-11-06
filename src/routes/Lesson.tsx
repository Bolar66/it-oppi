import { Link, useParams } from 'react-router'
import Markdown from 'react-markdown'
import { getUnit } from '../content/loader.ts'
import NotFound from './NotFound.tsx'

export default function Lesson() {
  const { pathId = '', unitId = '' } = useParams()
  const unit = getUnit(pathId, unitId)
  if (!unit) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <NotFound />
      </div>
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
      <article className="theory flex-1">
        <Markdown>{unit.theory}</Markdown>
      </article>

      <div className="sticky bottom-0 mt-6 bg-slate-900 pt-3">
        {/* Harjoitusten kulku toteutetaan vaiheessa 2. */}
        <button
          type="button"
          disabled
          className="w-full rounded-2xl bg-slate-700 py-4 text-lg font-semibold text-slate-400"
        >
          Harjoitukset ({unit.exercises.length}) – tulossa
        </button>
      </div>
    </div>
  )
}
