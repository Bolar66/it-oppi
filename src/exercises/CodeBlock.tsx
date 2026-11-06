import type { ReactNode } from 'react'
import { lineStyles } from './common.ts'

/** Koodilohko rivinumeroineen. renderLine voi korvata rivin sisällön (esim. aukot tai napautettavat rivit). */
export default function CodeBlock({
  code,
  language,
  renderLine,
}: {
  code: string
  language?: string
  renderLine?: (line: string, index: number) => ReactNode
}) {
  const s = lineStyles(language)
  const lines = code.split('\n')
  return (
    <div className={`rounded-xl bg-slate-950 py-2 leading-6 ${s.block}`}>
      {lines.map((line, i) => (
        <div key={i} className={s.row}>
          <span aria-hidden className="w-9 shrink-0 pr-3 text-right text-slate-600 select-none">
            {i + 1}
          </span>
          <span className={`text-slate-100 ${s.text}`}>{renderLine ? renderLine(line, i) : line || ' '}</span>
        </div>
      ))}
    </div>
  )
}
