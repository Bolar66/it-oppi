import { Link, useSearchParams } from 'react-router'
import { BookOpen, ChevronRight, Layers, ListChecks, Lock, PartyPopper, Shuffle, Spline, type LucideIcon } from 'lucide-react'
import { content } from '../content/loader.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { allTerms, MODE_LABELS, termCounts, unlockedTerms, type TermMode } from '../terms/session.ts'
import PathFilter from '../components/PathFilter.tsx'
import { EmptyState, PageHeader } from '../ui/components.tsx'
import { buttonClass, surface } from '../ui/styles.ts'

const MODES: { mode: Exclude<TermMode, 'mixed'>; icon: LucideIcon; hint: string }[] = [
  { mode: 'card', icon: Layers, hint: 'Käännä ja arvioi itse' },
  { mode: 'recognize', icon: ListChecks, hint: 'Valitse termi määritelmästä' },
  { mode: 'pairs', icon: Spline, hint: 'Yhdistä termit ja määritelmät' },
]

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
      <PageHeader title="Termit" subtitle="Alan sanasto kortteina, tunnistustehtävinä ja pareina." />

      <PathFilter value={pathId} onChange={(id) => setParams(id ? { path: id } : {}, { replace: true })} />

      {!counts ? (
        <p className="text-muted">Ladataan…</p>
      ) : counts.unlocked === 0 ? (
        <EmptyState icon={Lock} title="Termit avautuvat oppitunneista">
          Kun suoritat yksikön, sen termit tulevat tänne harjoiteltaviksi.
        </EmptyState>
      ) : (
        <>
          <dl className={`${surface} grid grid-cols-3 divide-x divide-line text-center`}>
            <Stat value={counts.due} label="Kerrattavana" />
            <Stat value={counts.fresh} label="Uusia" />
            <Stat value={`${counts.learned}/${counts.unlocked}`} label="Opittu" />
          </dl>

          {available === 0 ? (
            <EmptyState icon={PartyPopper} title="Ei harjoiteltavaa tänään">
              Seuraavat termit erääntyvät myöhemmin. Voit selata niitä sanastossa.
            </EmptyState>
          ) : (
            <section className="space-y-3">
              <Link to={practice('mixed')} className={buttonClass('primary')}>
                <Shuffle size={19} aria-hidden />
                Harjoittele {available} termiä
              </Link>
              <ul className={`${surface} divide-y divide-line overflow-hidden`}>
                {MODES.map(({ mode, icon: Icon, hint }) => (
                  <li key={mode}>
                    <Link to={practice(mode)} className="flex items-center gap-3 p-3.5 hover:bg-surface-2">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon size={20} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{MODE_LABELS[mode]}</span>
                        <span className="block text-sm text-muted">{hint}</span>
                      </span>
                      <ChevronRight size={18} className="text-faint" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Link to={`/terms/glossary${pathId ? `?path=${pathId}` : ''}`} className={buttonClass('secondary', 'lg')}>
        <BookOpen size={19} aria-hidden />
        Sanasto ({total} termiä)
      </Link>
    </div>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="p-3">
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  )
}
