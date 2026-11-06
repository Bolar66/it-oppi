import type { ExerciseType } from '../schemas/content.ts'
import type { AnswerFor, ExerciseOf } from './grade.ts'

export interface ExerciseProps<T extends ExerciseType> {
  exercise: ExerciseOf<T>
  answer: AnswerFor<T>
  onChange: (answer: AnswerFor<T>) => void
  /** true = vastaus on tarkistettu: lukitaan ja näytetään oikeat/väärät kohdat. */
  checked: boolean
}

export const DEFAULT_PROMPTS: Record<ExerciseType, string> = {
  multiple_choice: 'Valitse oikea vaihtoehto.',
  code_output: 'Mitä ohjelma tulostaa?',
  fill_blank: 'Täydennä puuttuvat kohdat.',
  order_lines: 'Järjestä rivit oikeaan järjestykseen.',
  match_pairs: 'Yhdistä parit.',
  find_bug: 'Millä rivillä on virhe?',
}

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong'

const choiceStates: Record<ChoiceState, string> = {
  idle: 'border-slate-600 bg-slate-800 active:bg-slate-700',
  selected: 'border-sky-400 bg-sky-950 text-sky-100',
  correct: 'border-green-500 bg-green-950 text-green-100',
  wrong: 'border-rose-500 bg-rose-950 text-rose-100',
}

/** Napautettavan valinnan tyyli (min. 44 px korkea kosketusalue). */
export function choiceClass(state: ChoiceState, extra = ''): string {
  return `min-h-11 w-full rounded-xl border-2 px-4 py-2.5 text-left transition-colors disabled:cursor-default ${choiceStates[state]} ${extra}`
}

/** Tekstikenttien yhteiset attribuutit: ei automaattista isoa alkukirjainta tai korjausta (iOS). */
export const codeInputProps = {
  autoCapitalize: 'off',
  autoCorrect: 'off',
  autoComplete: 'off',
  spellCheck: false,
} as const
