import type { Exercise } from '../schemas/content.ts'
import { DEFAULT_PROMPTS } from './common.ts'
import type { Answer, AnswerFor } from './grade.ts'
import MultipleChoice from './MultipleChoice.tsx'
import CodeOutput from './CodeOutput.tsx'
import FillBlank from './FillBlank.tsx'
import OrderLines from './OrderLines.tsx'
import MatchPairs from './MatchPairs.tsx'
import FindBug from './FindBug.tsx'

interface Props {
  exercise: Exercise
  answer: Answer
  onChange: (answer: Answer) => void
  checked: boolean
}

export default function ExerciseView({ exercise, answer, onChange, checked }: Props) {
  return (
    <div data-testid="exercise" data-exercise-id={exercise.id} className="space-y-4">
      <h2 className="font-sans text-xl leading-snug font-bold">{exercise.prompt ?? DEFAULT_PROMPTS[exercise.type]}</h2>
      <Body exercise={exercise} answer={answer} onChange={onChange} checked={checked} />
    </div>
  )
}

function Body({ exercise, answer, onChange, checked }: Props) {
  const common = { onChange, checked }
  switch (exercise.type) {
    case 'multiple_choice':
      return <MultipleChoice exercise={exercise} answer={answer as AnswerFor<'multiple_choice'>} {...common} />
    case 'code_output':
      return <CodeOutput exercise={exercise} answer={answer as AnswerFor<'code_output'>} {...common} />
    case 'fill_blank':
      return <FillBlank exercise={exercise} answer={answer as AnswerFor<'fill_blank'>} {...common} />
    case 'order_lines':
      return <OrderLines exercise={exercise} answer={answer as AnswerFor<'order_lines'>} {...common} />
    case 'match_pairs':
      return <MatchPairs exercise={exercise} answer={answer as AnswerFor<'match_pairs'>} {...common} />
    case 'find_bug':
      return <FindBug exercise={exercise} answer={answer as AnswerFor<'find_bug'>} {...common} />
  }
}
