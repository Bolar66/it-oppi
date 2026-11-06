import { emptyAnswer, grade, type Answer, type AnswerFor } from '../exercises/grade.ts'
import { termKey, type TermQuestion } from './session.ts'

export interface TermRunState {
  queue: TermQuestion[]
  position: number
  phase: 'answering' | 'feedback' | 'done'
  /** Tunnistus/parit: vastaus. Kortti: null. */
  answer: Answer | null
  flipped: boolean
  lastCorrect: boolean | null
  /** termKey → oikein ensimmäisellä kerralla kierroksen aikana. */
  firstTry: Record<string, boolean>
  attempt: number
}

export type TermAction =
  | { type: 'answer'; answer: Answer }
  | { type: 'flip' }
  /** correct[i] = refs[i] oikein. requeue = uusintakysymykset vääristä. */
  | { type: 'graded'; correct: boolean[]; requeue: TermQuestion[]; feedback: boolean }
  | { type: 'continue' }

const answerFor = (q: TermQuestion | undefined): Answer | null =>
  q && q.kind !== 'card' ? emptyAnswer(q.exercise) : null

export function initTermRun(queue: TermQuestion[]): TermRunState {
  return {
    queue,
    position: 0,
    phase: queue.length ? 'answering' : 'done',
    answer: answerFor(queue[0]),
    flipped: false,
    lastCorrect: null,
    firstTry: {},
    attempt: 0,
  }
}

export function currentQuestion(s: TermRunState): TermQuestion | undefined {
  return s.queue[s.position]
}

function advance(s: TermRunState): TermRunState {
  const position = s.position + 1
  if (position >= s.queue.length) return { ...s, position, phase: 'done', lastCorrect: null }
  return {
    ...s,
    position,
    phase: 'answering',
    answer: answerFor(s.queue[position]),
    flipped: false,
    lastCorrect: null,
    attempt: s.attempt + 1,
  }
}

export function termReducer(s: TermRunState, a: TermAction): TermRunState {
  const q = currentQuestion(s)
  switch (a.type) {
    case 'answer':
      return s.phase === 'answering' ? { ...s, answer: a.answer } : s
    case 'flip':
      return s.phase === 'answering' && q?.kind === 'card' ? { ...s, flipped: !s.flipped } : s
    case 'graded': {
      if (!q || s.phase !== 'answering') return s
      const firstTry = { ...s.firstTry }
      q.refs.forEach((ref, i) => {
        const key = termKey(ref)
        if (!(key in firstTry)) firstTry[key] = a.correct[i] ?? false
      })
      const next: TermRunState = {
        ...s,
        firstTry,
        lastCorrect: a.correct.every(Boolean),
        queue: [...s.queue, ...a.requeue],
      }
      return a.feedback ? { ...next, phase: 'feedback' } : advance(next)
    }
    case 'continue':
      return s.phase === 'feedback' ? advance(s) : s
  }
}

/** Tunnistuksen ja parien arviointi termikohtaisesti. */
export function gradeTermQuestion(q: TermQuestion, answer: Answer | null): boolean[] {
  if (q.kind === 'card' || !answer) return []
  if (q.kind === 'recognize') return [grade(q.exercise, answer)]
  const { matches } = answer as AnswerFor<'match_pairs'>
  return q.refs.map((_, i) => matches[i] === i)
}
