import { Link, useParams } from 'react-router'
import { getPath } from '../content/loader.ts'
import { useProgress, usePathStatus } from '../progress/hooks.ts'
import type { LevelStatus, UnitStatus } from '../progress/unlocks.ts'
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

const nodeStyles: Record<UnitStatus, string> = {
  completed: 'bg-amber-500 text-slate-900 shadow-[0_6px_0_#92400e]',
  open: 'bg-accent-dark text-white shadow-[0_6px_0_#14532d] ring-4 ring-accent/40',
  locked: 'bg-slate-700 text-slate-400 shadow-[0_6px_0_#1e293b]',
}

const pct = (x: number) => `${Math.round(x * 100)} %`

export default function PathMap() {
  const { pathId = '' } = useParams()
  const path = getPath(pathId)
  const progress = useProgress()
  const status = usePathStatus(path, progress)
  if (!path) return <NotFound />

  return (
    <div>
      <Link to="/" className="text-sm text-slate-400">
        ← Takaisin
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{path.title}</h1>
      <p className="text-sm text-slate-400">{path.description}</p>

      {status?.placementAvailable && (
        <Link
          to={`/placement/${path.id}`}
          className="mt-4 block rounded-xl border-2 border-sky-700 px-4 py-3 text-sm text-sky-200 active:bg-slate-800"
        >
          <span className="font-semibold">Osaatko jo perusteet?</span> Tee tasotesti ja hyppää tason 1 yli (raja{' '}
          {pct(path.placementTest.passThreshold)}).
        </Link>
      )}

      {status?.levels.map((lvl) => (
        <LevelSection key={lvl.level} pathId={path.id} lvl={lvl} titles={path.units} />
      ))}
    </div>
  )
}

function LevelSection({
  pathId,
  lvl,
  titles,
}: {
  pathId: string
  lvl: LevelStatus
  titles: Record<string, { title: string }>
}) {
  return (
    <section aria-label={`Taso ${lvl.level}`} className={`mt-8 ${lvl.unlocked ? '' : 'opacity-60'}`}>
      <h2 className="rounded-xl bg-slate-800 px-4 py-2 font-semibold">
        {!lvl.unlocked && '🔒 '}Taso {lvl.level}: {lvl.title}
      </h2>
      {!lvl.unlocked && (
        <p className="mt-2 px-1 text-sm text-slate-400">
          Avautuu, kun tason {lvl.level - 1} koe on läpäisty (≥ {pct(lvl.exam.passThreshold)}).
        </p>
      )}

      <ol className="mt-6 flex flex-col items-center gap-6">
        {lvl.units.map(({ unitId, status }, i) => {
          const title = titles[unitId]?.title ?? unitId
          const node = (
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${nodeStyles[status]}`}
            >
              {status === 'completed' ? '✓' : status === 'locked' ? '🔒' : i + 1}
            </span>
          )
          return (
            <li key={unitId} className={`flex flex-col items-center ${OFFSETS[i % OFFSETS.length]}`}>
              {status === 'locked' ? (
                <span role="img" aria-label={`${title} (lukittu)`}>
                  {node}
                </span>
              ) : (
                <Link
                  to={`/lesson/${pathId}/${unitId}`}
                  aria-label={status === 'completed' ? `${title} (suoritettu)` : title}
                  className="active:translate-y-1"
                >
                  {node}
                </Link>
              )}
              <span className="mt-2 max-w-40 text-center text-xs text-slate-300">{title}</span>
            </li>
          )
        })}
      </ol>

      <div className="mt-6">
        {lvl.exam.passed ? (
          <p className="rounded-xl bg-green-950 px-4 py-3 text-center text-sm text-green-200">
            ✓ Tason {lvl.level} koe läpäisty{lvl.exam.best !== null && ` (paras ${pct(lvl.exam.best)})`}
          </p>
        ) : lvl.exam.available ? (
          <Link
            to={`/exam/${pathId}/${lvl.level}`}
            className="block rounded-xl bg-sky-600 px-4 py-3 text-center font-semibold text-white active:bg-sky-700"
          >
            Tason {lvl.level} koe
            {lvl.exam.best !== null && <span className="block text-xs font-normal">Paras tähän asti {pct(lvl.exam.best)}</span>}
          </Link>
        ) : (
          lvl.unlocked && (
            <p className="rounded-xl border border-dashed border-slate-700 px-4 py-3 text-center text-sm text-slate-400">
              🔒 Tason {lvl.level} koe aukeaa, kun kaikki yksiköt on suoritettu.
            </p>
          )
        )}
      </div>
    </section>
  )
}
