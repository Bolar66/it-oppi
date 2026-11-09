import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Lock, Search, SearchX } from 'lucide-react'
import { content, getPath } from '../content/loader.ts'
import { useProgress } from '../progress/hooks.ts'
import { allTerms, termKey } from '../terms/session.ts'
import PathFilter from '../components/PathFilter.tsx'
import { EmptyState, PageHeader, PathIcon } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { surface } from '../ui/styles.ts'

const BOX_LABELS = ['Kertaus 1 pv', 'Kertaus 3 pv', 'Kertaus 7 pv', 'Opittu']

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
      <PageHeader title="Sanasto" back={{ to: `/terms${pathId ? `?path=${pathId}` : ''}`, label: 'Termit' }} />
      <label className="relative block">
        <Search size={18} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hae termiä tai määritelmää"
          aria-label="Hae sanastosta"
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full rounded-xl border border-line bg-surface py-3 pr-3 pl-10 text-base outline-none focus:border-primary"
        />
      </label>
      <PathFilter value={pathId} onChange={(id) => setParams(id ? { path: id } : {}, { replace: true })} />

      {terms.length === 0 && (
        <EmptyState icon={SearchX} title="Ei hakutuloksia">
          Kokeile toista hakusanaa tai valitse kaikki polut.
        </EmptyState>
      )}

      {[...grouped.entries()].map(([pid, refs]) => (
        <section key={pid} aria-label={getPath(pid)?.title ?? pid} style={pathTone(pid)} className="path-tone">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <PathIcon pathId={pid} size="sm" />
            {getPath(pid)?.title ?? pid}
          </h2>
          <ul className={`${surface} divide-y divide-line`}>
            {refs.map((r) => {
              const unlocked = progress?.completed.has(r.term.unit) ?? false
              const item = items.get(termKey(r))
              return (
                <li key={r.term.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold">
                      {r.term.term}
                      {r.term.en && r.term.en !== r.term.term && (
                        <span className="ml-1.5 text-sm font-normal text-muted italic">{r.term.en}</span>
                      )}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        !unlocked
                          ? 'bg-surface-2 text-muted'
                          : item?.box === 3
                            ? 'bg-good-soft text-good'
                            : 'bg-path-soft text-path-ink'
                      }`}
                    >
                      {!unlocked && <Lock size={12} aria-hidden />}
                      {!unlocked ? 'Lukittu' : item ? BOX_LABELS[item.box] : 'Uusi'}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.95rem] text-ink">{r.term.definition}</p>
                  {r.term.example && (
                    <code className="mt-2 inline-block rounded-md bg-code px-2 py-1 font-mono text-xs text-path-ink">
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
