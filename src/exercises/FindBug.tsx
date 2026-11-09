import { lineStyles, type ExerciseProps } from './common.ts'

export default function FindBug({ exercise, answer, onChange, checked }: ExerciseProps<'find_bug'>) {
  const lines = exercise.code.split('\n')
  const s = lineStyles(exercise.language)
  return (
    <div role="radiogroup" aria-label="Koodin rivit" className={`rounded-xl border border-line bg-code py-1.5 ${s.block}`}>
      {lines.map((line, i) => {
        const n = i + 1
        const selected = answer.line === n
        let tone = selected ? 'bg-primary-soft ring-2 ring-primary' : 'active:bg-surface-2'
        if (checked) tone = n === exercise.bugLine ? 'bg-good-soft ring-2 ring-good' : selected ? 'bg-bad-soft ring-2 ring-bad' : ''
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
            <span aria-hidden className="w-9 shrink-0 pr-3 text-right text-muted select-none">
              {n}
            </span>
            <span className={`text-ink ${s.text}`}>{line || ' '}</span>
          </button>
        )
      })}
    </div>
  )
}
