import { Link, useSearchParams } from 'react-router'
import { content } from '../content/loader.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { allTerms, MODE_LABELS, termCounts, unlockedTerms, type TermMode } from '../terms/session.ts'
import PathFilter from '../components/PathFilter.tsx'

export default function Terms() {
  const [params, setParams] = useSearchParams()
  const pathId = params.get('path') ?? ''
  const progress = useProgress()
  const today = dayKey(new Date())

  const total = allTerms(content.paths, pathId || undefined).length
  const unlocked = progress ? unlockedTerms(content.paths, progress.completed, pathId || undefined) : []
  const counts = progress ? termCounts(unlocked, progress.termItems, today) : null
  const available = counts ? Math.min(10, counts.due + counts.fresh) : 0

  const practice = (mode: TermMode) => `/terms/practice?mode=${mode}${pathId ? `&path=${pathId}` : ''}`

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Termit</h1>
        <p className="text-sm text-slate-400">Alan sanasto kortteina, tunnistustehtävinä ja pareina.</p>
      </header>

      <PathFilter value={pathId} onChange={(id) => setParams(id ? { path: id } : {}, { replace: true })} />

      {!counts ? (
        <p className="text-slate-400">Ladataan…</p>
      ) : (
        <>
          <section aria-label="Termien tilanne" className="grid grid-cols-3 gap-3 text-center">
            <Tile value={counts.due} label="Kerrattavana" />
            <Tile value={counts.fresh} label="Uusia" />
            <Tile value={`${counts.learned}/${total}`} label="Opittu" />
          </section>

          {counts.unlocked === 0 ? (
            <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
              Termit avautuvat, kun suoritat yksiköitä. Suorita ensimmäinen oppitunti, niin sen termit tulevat harjoiteltaviksi.
            </p>
          ) : available === 0 ? (
            <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
              Ei kerrattavaa tänään. 🎉 Seuraavat termit erääntyvät myöhemmin – voit selata niitä sanastossa.
            </p>
          ) : (
            <div className="space-y-3">
              <Link
                to={practice('mixed')}
                className="block rounded-2xl bg-violet-600 px-4 py-4 text-center text-white active:translate-y-0.5"
              >
                <span className="block text-lg font-semibold">Harjoittele</span>
                <span className="block text-sm opacity-90">{available} termiä · sekoitus</span>
              </Link>
              <div className="grid grid-cols-3 gap-2">
                {(['card', 'recognize', 'pairs'] as const).map((m) => (
                  <Link
                    key={m}
                    to={practice(m)}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-2 text-center text-sm active:bg-slate-700"
                  >
                    {MODE_LABELS[m]}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Link
        to={`/terms/glossary${pathId ? `?path=${pathId}` : ''}`}
        className="block rounded-xl border border-slate-700 px-4 py-3 text-center font-semibold active:bg-slate-800"
      >
        📖 Sanasto ({total} termiä)
      </Link>
    </div>
  )
}

function Tile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-800 p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
