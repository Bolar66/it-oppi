import type { Exercise } from '../schemas/content.ts'
import CodeBlock from './CodeBlock.tsx'
import { BLANK } from '../schemas/content.ts'

/** Oikean vastauksen näyttö palautepaneelissa väärän vastauksen jälkeen. */
export default function CorrectAnswer({ exercise }: { exercise: Exercise }) {
  switch (exercise.type) {
    case 'multiple_choice':
      return <p className="font-semibold">{exercise.options[exercise.answer]}</p>
    case 'code_output':
      return <CodeBlock code={exercise.answer || '(tyhjä tuloste)'} />
    case 'fill_blank': {
      const filled = exercise.code
        .split(BLANK)
        .map((part, j) => (j === 0 ? part : (exercise.answers[j - 1] ?? '') + part))
        .join('')
      return <CodeBlock code={filled} language={exercise.language} />
    }
    case 'order_lines':
      return <CodeBlock code={exercise.lines.join('\n')} language={exercise.language} />
    case 'match_pairs':
      return (
        <ul className="space-y-1 text-sm">
          {exercise.pairs.map(([l, r]) => (
            <li key={l}>
              <span className="font-mono">{l}</span> → {r}
            </li>
          ))}
        </ul>
      )
    case 'find_bug':
      return (
        <p>
          Rivi {exercise.bugLine}:{' '}
          <code className="font-mono">{exercise.code.split('\n')[exercise.bugLine - 1]?.trim()}</code>
        </p>
      )
  }
}
