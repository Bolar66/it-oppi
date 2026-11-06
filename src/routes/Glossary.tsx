import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { content, getPath } from '../content/loader.ts'
import { useProgress } from '../progress/hooks.ts'
import { allTerms, termKey } from '../terms/session.ts'
import PathFilter from '../components/PathFilter.tsx'

const BOX_LABELS = ['kerrataan 1 pv päästä', 'kerrataan 3 pv välein', 'kerrataan 7 pv välein', 'opittu']

export default function Glossary() {
  const [params, setParams] = useSearchParams()
  const pathId = params.get('path') ?? ''
  const [query, setQuery] = useState('')
  const progress = useProgress()
  const items = new Map(progress?.termItems.map((i) => [i.key, i]))

  const q = query.trim().toLowerCase()
  const terms = allTerms(content.paths, pathId || undefined).filter(
    ({ term }) =>
      !q || [term.term, term.en ?? '', term.definition].some((s) => s.toLowerCase().includes(q)),
  )
  const grouped = new Map<string, typeof terms>()
  for (const r of terms) grouped.set(r.pathId, [...(grouped.get(r.pathId) ?? []), r])

  return (
    <div className="space-y-5">
      <Link to={`/terms${pathId ? `?path=${pathId}` : ''}`} className="text-sm text-slate-400">
        ← Termit
      </Link>
      <h1 className="text-2xl font-bold">Sanasto</h1>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Hae termiä tai määritelmää…"
        aria-label="Hae sanastosta"
        autoCapitalize="off"
        autoCorrect="off"
        className="w-full rounded-xl border-2 border-slate-700 bg-slate-950 px-3 py-2.5 text-base outline-none focus:border-violet-400"
      />
      <PathFilter value={pathId} onChange={(id) => setParams(id ? { path: id } : {}, { replace: true })} />

      {terms.length === 0 && <p className="text-slate-400">Ei hakutuloksia.</p>}

      {[...grouped.entries()].map(([pid, refs]) => (
        <section key={pid} aria-label={getPath(pid)?.title ?? pid} className="space-y-2">
          <h2 className="text-lg font-semibold">{getPath(pid)?.title ?? pid}</h2>
          <ul className="space-y-2">
            {refs.map((r) => {
              const unlocked = progress?.completed.has(r.term.unit) ?? false
              const item = items.get(termKey(r))
              return (
                <li key={r.term.id} className="rounded-xl bg-slate-800 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {r.term.term}
                      {r.term.en && r.term.en !== r.term.term && (
                        <span className="ml-1 text-sm font-normal text-violet-300 italic">({r.term.en})</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {!unlocked ? '🔒 lukittu' : item ? BOX_LABELS[item.box] : 'uusi'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-200">{r.term.definition}</p>
                  {r.term.example && (
                    <code className="mt-2 block rounded-lg bg-slate-950 px-2 py-1 font-mono text-xs text-accent">
                      {r.term.example}
                    </code>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
