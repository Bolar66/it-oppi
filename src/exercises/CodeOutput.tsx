import CodeBlock from './CodeBlock.tsx'
import { codeInputProps, type ExerciseProps } from './common.ts'
import { isOutputCorrect } from './grade.ts'

export default function CodeOutput({ exercise, answer, onChange, checked }: ExerciseProps<'code_output'>) {
  const multiline = exercise.answer.includes('\n')
  const border = checked
    ? isOutputCorrect(exercise, answer.text)
      ? 'border-good'
      : 'border-bad'
    : 'border-line focus:border-primary'
  const className = `w-full rounded-xl border-2 bg-surface px-3 py-2.5 font-mono text-base outline-none ${border}`

  return (
    <div className="space-y-4">
      <CodeBlock code={exercise.code} />
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Tuloste</span>
        {multiline ? (
          <textarea
            {...codeInputProps}
            aria-label="Vastaus"
            rows={Math.min(8, exercise.answer.split('\n').length + 1)}
            value={answer.text}
            readOnly={checked}
            onChange={(e) => onChange({ ...answer, text: e.target.value })}
            className={className}
          />
        ) : (
          <input
            {...codeInputProps}
            aria-label="Vastaus"
            value={answer.text}
            readOnly={checked}
            onChange={(e) => onChange({ ...answer, text: e.target.value })}
            className={className}
          />
        )}
      </label>
      {multiline && !checked && (
        <p className="text-xs text-muted">Monirivinen vastaus. Koneella Ctrl+Enter tarkistaa.</p>
      )}
    </div>
  )
}
