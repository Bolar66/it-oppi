import type { ReactNode } from 'react'
import { CircleCheck, CircleX, X, type LucideIcon } from 'lucide-react'
import { ProgressBar } from './components.tsx'

/** Harjoitusnäkymän yläpalkki: lopetus, edistyminen ja valinnainen oikean reunan toiminto. */
export function RunnerHeader({
  onExit,
  exitLabel,
  value,
  max,
  aside,
}: {
  onExit: () => void
  exitLabel: string
  value: number
  max: number
  aside?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={onExit}
          aria-label={exitLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X size={22} aria-hidden />
        </button>
        <ProgressBar value={value} max={max} label="Edistyminen" className="h-2.5 flex-1" />
        {aside}
      </div>
    </header>
  )
}

/** Vastauksen palaute toimintopalkin yläpuolella. */
export function Feedback({ correct, children }: { correct: boolean; children?: ReactNode }) {
  const Icon = correct ? CircleCheck : CircleX
  return (
    <div role="status" className="mb-4 max-h-[45dvh] overflow-y-auto">
      <p className={`flex items-center gap-2 font-display text-xl font-bold ${correct ? 'text-good' : 'text-bad'}`}>
        <Icon size={24} aria-hidden />
        {correct ? 'Oikein!' : 'Ei aivan.'}
      </p>
      {children && <div className="mt-2 space-y-2 text-[0.95rem] text-ink">{children}</div>}
    </div>
  )
}

/** Tulosnäkymä kierroksen lopussa. */
export function ResultScreen({
  icon: Icon,
  tone = 'primary',
  kicker,
  title,
  stats,
  children,
}: {
  icon: LucideIcon
  tone?: 'primary' | 'good' | 'bad'
  kicker?: string
  title: string
  stats: { value: string; label: string }[]
  children: ReactNode
}) {
  const badge = { primary: 'bg-primary-soft text-primary', good: 'bg-good-soft text-good', bad: 'bg-bad-soft text-bad' }[tone]
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <div className="text-center">
        <span className={`mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full ${badge}`}>
          <Icon size={38} aria-hidden />
        </span>
        {kicker && <p className="text-sm text-muted">{kicker}</p>}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4 text-center">
            <dd className="font-display text-3xl font-bold tabular-nums">{s.value}</dd>
            <dt className="mt-1 text-sm text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-6 space-y-3">{children}</div>
    </div>
  )
}
