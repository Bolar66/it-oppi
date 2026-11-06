import { Link, useParams } from 'react-router'
import { getPath } from '../content/loader.ts'
import NotFound from './NotFound.tsx'

/** Siksak-sijoittelu Duolingo-tyyliseen polkuun. */
const OFFSETS = [
  'translate-x-0',
  'translate-x-12',
  'translate-x-16',
  'translate-x-12',
  'translate-x-0',
  '-translate-x-12',
  '-translate-x-16',
  '-translate-x-12',
]

export default function PathMap() {
  const { pathId = '' } = useParams()
  const path = getPath(pathId)
  if (!path) return <NotFound />

  return (
    <div>
      <Link to="/" className="text-sm text-slate-400">
        ← Takaisin
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{path.title}</h1>
      <p className="text-sm text-slate-400">{path.description}</p>

      {path.levels.map((lvl) => (
        <section key={lvl.level} className="mt-8">
          <h2 className="rounded-xl bg-slate-800 px-4 py-2 font-semibold">
            Taso {lvl.level}: {lvl.title}
          </h2>
          <ol className="mt-6 flex flex-col items-center gap-6">
            {lvl.units.map((unitId, i) => {
              const unit = path.units[unitId]
              if (!unit) return null
              return (
                <li key={unitId} className={`flex flex-col items-center ${OFFSETS[i % OFFSETS.length]}`}>
                  <Link
                    to={`/lesson/${path.id}/${unitId}`}
                    aria-label={unit.title}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-dark text-xl font-bold text-white shadow-[0_6px_0_#14532d] active:translate-y-1 active:shadow-none"
                  >
                    {i + 1}
                  </Link>
                  <span className="mt-2 max-w-40 text-center text-xs text-slate-300">{unit.title}</span>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
