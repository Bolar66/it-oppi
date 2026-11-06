import type { ReactNode } from 'react'

/** Koodilohko rivinumeroineen. renderLine voi korvata rivin sisällön (esim. aukot tai napautettavat rivit). */
export default function CodeBlock({
  code,
  renderLine,
}: {
  code: string
  renderLine?: (line: string, index: number) => ReactNode
}) {
  const lines = code.split('\n')
  return (
    <div className="overflow-x-auto rounded-xl bg-slate-950 py-2 font-mono text-sm leading-6">
      {lines.map((line, i) => (
        <div key={i} className="flex min-w-max">
          <span aria-hidden className="w-9 shrink-0 pr-3 text-right text-slate-600 select-none">
            {i + 1}
          </span>
          <span className="pr-4 whitespace-pre text-slate-100">{renderLine ? renderLine(line, i) : line || ' '}</span>
        </div>
      ))}
    </div>
  )
}
