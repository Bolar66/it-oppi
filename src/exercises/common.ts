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
  idle: 'border-line bg-surface active:bg-surface-2',
  selected: 'border-primary bg-primary-soft text-primary',
  correct: 'border-good bg-good-soft text-good',
  wrong: 'border-bad bg-bad-soft text-bad',
}

/** Napautettavan valinnan tyyli (min. 44 px korkea kosketusalue). */
export function choiceClass(state: ChoiceState, extra = ''): string {
  return `min-h-11 w-full rounded-xl border-2 px-4 py-2.5 text-left transition-colors disabled:cursor-default ${choiceStates[state]} ${extra}`
}

/**
 * language: 'text' = tavallista tekstiä (esim. väitteitä), ei koodia: tavallinen fontti ja rivitys,
 * jotta pitkät lauseet eivät vieri sivuttain puhelimella.
 */
export function lineStyles(language?: string) {
  const prose = language === 'text'
  return {
    prose,
    block: prose ? 'font-sans text-base' : 'font-mono text-sm overflow-x-auto',
    row: prose ? 'flex' : 'flex min-w-max',
    text: prose ? 'min-w-0 pr-3 whitespace-pre-wrap break-words' : 'pr-4 whitespace-pre',
  }
}

/** Tekstikenttien yhteiset attribuutit: ei automaattista isoa alkukirjainta tai korjausta (iOS). */
export const codeInputProps = {
  autoCapitalize: 'off',
  autoCorrect: 'off',
  autoComplete: 'off',
  spellCheck: false,
} as const
