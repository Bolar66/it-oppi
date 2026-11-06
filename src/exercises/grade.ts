import { BLANK, type Exercise, type ExerciseType } from '../schemas/content.ts'

/** Käyttäjän vastaus, yksi muoto per harjoitustyyppi. */
export type Answer =
  | { type: 'multiple_choice'; choice: number | null }
  | { type: 'code_output'; text: string }
  | { type: 'fill_blank'; values: string[] }
  /** Indeksit exercise.lines-taulukkoon siinä järjestyksessä kuin käyttäjä ne valitsi. */
  | { type: 'order_lines'; order: number[] }
  /** matches[vasen] = oikean sarakkeen alkuperäinen indeksi (pairs[j][1]) tai null. */
  | { type: 'match_pairs'; matches: (number | null)[] }
  /** 1-pohjainen rivinumero. */
  | { type: 'find_bug'; line: number | null }

export type AnswerFor<T extends ExerciseType> = Extract<Answer, { type: T }>
export type ExerciseOf<T extends ExerciseType> = Extract<Exercise, { type: T }>

export function emptyAnswer(ex: Exercise): Answer {
  switch (ex.type) {
    case 'multiple_choice':
      return { type: ex.type, choice: null }
    case 'code_output':
      return { type: ex.type, text: '' }
    case 'fill_blank':
      return { type: ex.type, values: ex.answers.map(() => '') }
    case 'order_lines':
      return { type: ex.type, order: [] }
    case 'match_pairs':
      return { type: ex.type, matches: ex.pairs.map(() => null) }
    case 'find_bug':
      return { type: ex.type, line: null }
  }
}

/** Tulosteen vertailu: rivinvaihdot yhtenäistetään, rivien lopun välilyönnit ja lopun tyhjät rivit ohitetaan. */
export function normalizeOutput(s: string): string {
  const lines = s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

export function isOutputCorrect(ex: ExerciseOf<'code_output'>, text: string): boolean {
  return normalizeOutput(text) === normalizeOutput(ex.answer)
}

/** Koodissa kirjainkoko ratkaisee; tavallisessa tekstissä (language: text) ei. */
export function isBlankCorrect(ex: ExerciseOf<'fill_blank'>, index: number, value: string): boolean {
  const want = (ex.answers[index] ?? '').trim()
  const got = value.trim()
  return ex.language === 'text' ? got.toLocaleLowerCase('fi') === want.toLocaleLowerCase('fi') : got === want
}

/** Jakaa fill_blank-koodin riveiksi; numero = aukon indeksi. */
export function blankSegments(code: string): (string | number)[][] {
  let index = 0
  return code.split('\n').map((line) => {
    const parts = line.split(BLANK)
    const out: (string | number)[] = []
    parts.forEach((part, j) => {
      if (part) out.push(part)
      if (j < parts.length - 1) out.push(index++)
    })
    return out
  })
}

/** Onko vastaus valmis tarkistettavaksi. */
export function isComplete(ex: Exercise, answer: Answer): boolean {
  if (answer.type !== ex.type) return false
  switch (answer.type) {
    case 'multiple_choice':
      return answer.choice !== null
    case 'code_output':
      return answer.text.trim() !== ''
    case 'fill_blank':
      return answer.values.every((v) => v.trim() !== '')
    case 'order_lines':
      return answer.order.length === (ex as ExerciseOf<'order_lines'>).lines.length
    case 'match_pairs':
      return answer.matches.every((m) => m !== null)
    case 'find_bug':
      return answer.line !== null
  }
}

export function grade(ex: Exercise, answer: Answer): boolean {
  if (answer.type !== ex.type || !isComplete(ex, answer)) return false
  switch (ex.type) {
    case 'multiple_choice':
      return (answer as AnswerFor<'multiple_choice'>).choice === ex.answer
    case 'code_output':
      return isOutputCorrect(ex, (answer as AnswerFor<'code_output'>).text)
    case 'fill_blank':
      return (answer as AnswerFor<'fill_blank'>).values.every((v, i) => isBlankCorrect(ex, i, v))
    case 'order_lines':
      return (answer as AnswerFor<'order_lines'>).order.every((lineIndex, i) => lineIndex === i)
    case 'match_pairs':
      return (answer as AnswerFor<'match_pairs'>).matches.every((m, i) => m === i)
    case 'find_bug':
      return (answer as AnswerFor<'find_bug'>).line === ex.bugLine
  }
}
