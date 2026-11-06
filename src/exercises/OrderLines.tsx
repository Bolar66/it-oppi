import { useState } from 'react'
import type { ExerciseProps } from './common.ts'
import { grade } from './grade.ts'
import { shuffledIndices } from './shuffle.ts'

export default function OrderLines({ exercise, answer, onChange, checked }: ExerciseProps<'order_lines'>) {
  const [pool] = useState(() => shuffledIndices(exercise.lines.length))
  const lineClass = `block min-h-11 w-full rounded-lg border-2 px-3 py-2 text-left disabled:cursor-default ${
    exercise.language === 'text' ? 'text-base break-words' : 'font-mono text-sm whitespace-pre overflow-x-auto'
  }`
  const remaining = pool.filter((i) => !answer.order.includes(i))
  const resultBorder = checked ? (grade(exercise, answer) ? 'border-green-500' : 'border-rose-500') : 'border-slate-700'

  return (
    <div className="space-y-4">
      <section aria-label="Vastauksesi" className={`min-h-24 space-y-2 rounded-xl border-2 border-dashed p-2 ${resultBorder}`}>
        {answer.order.length === 0 && (
          <p className="px-2 py-3 text-sm text-slate-500">Napauta rivejä alta oikeassa järjestyksessä.</p>
        )}
        {answer.order.map((lineIndex) => (
          <button
            key={lineIndex}
            type="button"
            disabled={checked}
            onClick={() => onChange({ ...answer, order: answer.order.filter((i) => i !== lineIndex) })}
            className={`${lineClass} border-slate-600 bg-slate-950`}
          >
            {exercise.lines[lineIndex]}
          </button>
        ))}
      </section>

      <section aria-label="Rivit" className="space-y-2">
        {remaining.map((lineIndex) => (
          <button
            key={lineIndex}
            type="button"
            disabled={checked}
            onClick={() => onChange({ ...answer, order: [...answer.order, lineIndex] })}
            className={`${lineClass} border-slate-600 bg-slate-800 active:bg-slate-700`}
          >
            {exercise.lines[lineIndex]}
          </button>
        ))}
      </section>
    </div>
  )
}
