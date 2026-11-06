import { content } from '../content/loader.ts'

const pathsWithTerms = content.paths.filter((p) => p.terms.length > 0)

/** Polun valinta (?path=). Tyhjä = kaikki polut. */
export default function PathFilter({ value, onChange }: { value: string; onChange: (pathId: string) => void }) {
  const options = [{ id: '', title: 'Kaikki' }, ...pathsWithTerms.map((p) => ({ id: p.id, title: p.title }))]
  return (
    <div role="radiogroup" aria-label="Polku" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id || 'all'}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 rounded-full border px-3 text-sm ${value === o.id ? 'border-violet-400 bg-violet-950 text-violet-100' : 'border-slate-700 bg-slate-800 text-slate-300'}`}
        >
          {o.title}
        </button>
      ))}
    </div>
  )
}
