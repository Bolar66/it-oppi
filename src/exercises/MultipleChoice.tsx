import { choiceClass, type ChoiceState, type ExerciseProps } from './common.ts'

export default function MultipleChoice({ exercise, answer, onChange, checked }: ExerciseProps<'multiple_choice'>) {
  return (
    <div role="radiogroup" aria-label="Vaihtoehdot" className="space-y-3">
      {exercise.options.map((option, i) => {
        const selected = answer.choice === i
        let state: ChoiceState = selected ? 'selected' : 'idle'
        if (checked) state = i === exercise.answer ? 'correct' : selected ? 'wrong' : 'idle'
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option}
            disabled={checked}
            onClick={() => onChange({ ...answer, choice: i })}
            className={choiceClass(state, 'flex items-center gap-3')}
          >
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/30 font-display text-sm font-semibold opacity-80"
            >
              {i + 1}
            </span>
            <span>{option}</span>
          </button>
        )
      })}
    </div>
  )
}
