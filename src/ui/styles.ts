/** Yhteiset luokat painikkeille ja pinnoille, jotta sama toiminto näyttää aina samalta. */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'good' | 'bad' | 'danger'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover disabled:bg-surface-2 disabled:text-faint',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 disabled:text-faint',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  good: 'bg-good text-on-primary',
  bad: 'bg-bad text-on-primary',
  danger: 'bg-bad-soft text-bad hover:brightness-95',
}

const sizes = {
  lg: 'min-h-13 px-5 text-base font-semibold rounded-2xl w-full',
  md: 'min-h-11 px-4 text-[0.95rem] font-semibold rounded-xl',
  sm: 'min-h-9 px-3 text-sm font-medium rounded-lg',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: keyof typeof sizes = 'lg', extra = ''): string {
  return `inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed active:translate-y-px ${variants[variant]} ${sizes[size]} ${extra}`
}

/** Tavallinen pinta (kortti). */
export const surface = 'rounded-2xl border border-line bg-surface'
