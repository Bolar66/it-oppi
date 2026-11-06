import { codeInputProps, lineStyles, type ExerciseProps } from './common.ts'
import { blankSegments, isBlankCorrect } from './grade.ts'

export default function FillBlank({ exercise, answer, onChange, checked }: ExerciseProps<'fill_blank'>) {
  const lines = blankSegments(exercise.code)
  const s = lineStyles(exercise.language)

  const setValue = (index: number, value: string) =>
    onChange({ ...answer, values: answer.values.map((v, i) => (i === index ? value : v)) })

  return (
    <div className={`rounded-xl bg-slate-950 py-2 leading-9 ${s.block}`}>
      {lines.map((segments, li) => (
        <div key={li} className={`${s.row} items-start`}>
          <span aria-hidden className="w-9 shrink-0 pr-3 text-right text-slate-600 select-none">
            {li + 1}
          </span>
          <span className={`text-slate-100 ${s.text}`}>
            {segments.length === 0 && ' '}
            {segments.map((seg, si) => {
              if (typeof seg === 'string') return <span key={si}>{seg}</span>
              const value = answer.values[seg] ?? ''
              const border = checked
                ? isBlankCorrect(exercise, seg, value)
                  ? 'border-green-500 text-green-200'
                  : 'border-rose-500 text-rose-200'
                : 'border-sky-500 focus:border-sky-300'
              return (
                <input
                  key={si}
                  {...codeInputProps}
                  aria-label={`Aukko ${seg + 1}`}
                  value={value}
                  readOnly={checked}
                  onChange={(e) => setValue(seg, e.target.value)}
                  style={{ width: `${Math.max(4, value.length + 2)}ch` }}
                  className={`mx-0.5 rounded-md border-2 bg-slate-800 px-1 py-0.5 text-base outline-none ${s.prose ? 'font-sans' : 'font-mono'} ${border}`}
                />
              )
            })}
          </span>
        </div>
      ))}
    </div>
  )
}
