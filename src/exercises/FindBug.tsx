import { lineStyles, type ExerciseProps } from './common.ts'

export default function FindBug({ exercise, answer, onChange, checked }: ExerciseProps<'find_bug'>) {
  const lines = exercise.code.split('\n')
  const s = lineStyles(exercise.language)
  return (
    <div role="radiogroup" aria-label="Koodin rivit" className={`rounded-xl bg-slate-950 py-2 ${s.block}`}>
      {lines.map((line, i) => {
        const n = i + 1
        const selected = answer.line === n
        let tone = selected ? 'bg-sky-900/70 ring-2 ring-sky-400' : 'active:bg-slate-800'
        if (checked) tone = n === exercise.bugLine ? 'bg-green-900/70 ring-2 ring-green-500' : selected ? 'bg-rose-900/70 ring-2 ring-rose-500' : ''
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Rivi ${n}`}
            disabled={checked}
            onClick={() => onChange({ ...answer, line: n })}
            className={`flex min-h-11 w-full items-center py-1 text-left ring-inset disabled:cursor-default ${s.prose ? '' : 'min-w-max'} ${tone}`}
          >
            <span aria-hidden className="w-9 shrink-0 pr-3 text-right text-slate-500 select-none">
              {n}
            </span>
            <span className={`text-slate-100 ${s.text}`}>{line || ' '}</span>
          </button>
        )
      })}
    </div>
  )
}
