import { content } from '../content/loader.ts'
import { pathStyle, pathTone } from '../ui/pathStyle.ts'

const pathsWithTerms = content.paths.filter((p) => p.terms.length > 0)

/** Polun valinta (?path=). Tyhjä = kaikki polut. Yksi vaakasuunnassa vieritettävä rivi. */
export default function PathFilter({ value, onChange }: { value: string; onChange: (pathId: string) => void }) {
  const options = [{ id: '', title: 'Kaikki' }, ...pathsWithTerms.map((p) => ({ id: p.id, title: p.title }))]
  return (
    <div
      role="radiogroup"
      aria-label="Polku"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const active = value === o.id
        const Icon = o.id ? pathStyle(o.id).icon : null
        return (
          <button
            key={o.id || 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            style={o.id ? pathTone(o.id) : undefined}
            className={`path-tone inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors ${active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink hover:bg-surface-2'}`}
          >
            {Icon && <Icon size={15} aria-hidden className={active ? '' : 'text-path'} />}
            {o.title}
          </button>
        )
      })}
    </div>
  )
}
