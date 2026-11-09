import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { pathStyle, pathTone } from './pathStyle.ts'

/** Polun kuvake pehmeällä polun värillä. */
export function PathIcon({ pathId, size = 'md' }: { pathId: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = pathStyle(pathId).icon
  const box = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }[size]
  const icon = { sm: 18, md: 22, lg: 28 }[size]
  return (
    <span
      aria-hidden
      style={pathTone(pathId)}
      className={`path-tone inline-flex shrink-0 items-center justify-center bg-path-soft text-path ${box}`}
    >
      <Icon size={icon} strokeWidth={2} />
    </span>
  )
}

export function ProgressBar({
  value,
  max,
  label,
  tone = 'primary',
  className = '',
}: {
  value: number
  max: number
  label: string
  tone?: 'primary' | 'path' | 'good'
  className?: string
}) {
  const pct = max > 0 ? Math.min(1, value / max) * 100 : 0
  const fill = { primary: 'bg-primary', path: 'bg-path', good: 'bg-good' }[tone]
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Sivun otsikko, valinnainen paluulinkki ja alaotsikko. */
export function PageHeader({
  title,
  back,
  subtitle,
  children,
}: {
  title: string
  back?: { to: string; label: string }
  subtitle?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="-ml-2 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          {back.label}
        </Link>
      )}
      <h1 className="text-[1.75rem] leading-tight font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      {children}
    </header>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {aside && <span className="text-sm text-muted">{aside}</span>}
    </div>
  )
}

/** Tyhjä tila: mitä tästä puuttuu ja mitä voi tehdä. */
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-8 text-center">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Icon size={22} aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm text-muted">{children}</div>}
    </div>
  )
}

/** Alareunaan kiinnittyvä toimintopalkki harjoitusnäkymiin. */
export function ActionBar({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'good' | 'bad' }) {
  const bg = { plain: 'bg-bg border-line', good: 'bg-good-soft border-good/40', bad: 'bg-bad-soft border-bad/40' }[tone]
  return (
    <footer className={`sticky bottom-0 z-10 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${bg}`}>
      <div className="mx-auto max-w-xl">{children}</div>
    </footer>
  )
}
