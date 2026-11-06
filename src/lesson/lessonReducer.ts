import type { Exercise } from '../schemas/content.ts'
import { emptyAnswer, grade, isComplete, type Answer } from '../exercises/grade.ts'

export const XP_PER_CORRECT = 10
export const PERFECT_BONUS_XP = 20

export interface LessonState {
  exercises: Exercise[]
  /** Harjoitusindeksit kysymysjärjestyksessä. Väärin menneet lisätään loppuun uudelleen. */
  queue: number[]
  position: number
  phase: 'answering' | 'feedback' | 'done'
  answer: Answer
  lastCorrect: boolean | null
  /** Harjoituksen id → menikö oikein ensimmäisellä yrityksellä. */
  firstTry: Record<string, boolean>
  /** Oikein vastattujen eri harjoitusten määrä (edistymispalkki). */
  solved: number
  /** Kasvaa jokaisella kysymyksellä; käytetään komponentin key:nä, jotta sekoitus tehdään uudelleen. */
  attempt: number
}

export type LessonAction = { type: 'answer'; answer: Answer } | { type: 'check' } | { type: 'continue' }

export function initLesson(exercises: Exercise[]): LessonState {
  const first = exercises[0]
  if (!first) throw new Error('Oppitunnissa ei ole harjoituksia')
  return {
    exercises,
    queue: exercises.map((_, i) => i),
    position: 0,
    phase: 'answering',
    answer: emptyAnswer(first),
    lastCorrect: null,
    firstTry: {},
    solved: 0,
    attempt: 0,
  }
}

export function currentExercise(state: LessonState): Exercise {
  return state.exercises[state.queue[state.position]!]!
}

export function lessonReducer(state: LessonState, action: LessonAction): LessonState {
  switch (action.type) {
    case 'answer':
      if (state.phase !== 'answering' || action.answer.type !== state.answer.type) return state
      return { ...state, answer: action.answer }

    case 'check': {
      const ex = currentExercise(state)
      if (state.phase !== 'answering' || !isComplete(ex, state.answer)) return state
      const correct = grade(ex, state.answer)
      return {
        ...state,
        phase: 'feedback',
        lastCorrect: correct,
        firstTry: ex.id in state.firstTry ? state.firstTry : { ...state.firstTry, [ex.id]: correct },
        solved: state.solved + (correct ? 1 : 0),
        queue: correct ? state.queue : [...state.queue, state.queue[state.position]!],
      }
    }

    case 'continue': {
      if (state.phase !== 'feedback') return state
      const position = state.position + 1
      if (position >= state.queue.length) return { ...state, phase: 'done', lastCorrect: null }
      return {
        ...state,
        position,
        phase: 'answering',
        lastCorrect: null,
        answer: emptyAnswer(state.exercises[state.queue[position]!]!),
        attempt: state.attempt + 1,
      }
    }
  }
}

export interface LessonSummary {
  total: number
  firstTryCorrect: number
  perfect: boolean
  xp: number
}

export function summarize(state: LessonState): LessonSummary {
  const total = state.exercises.length
  const firstTryCorrect = Object.values(state.firstTry).filter(Boolean).length
  const perfect = firstTryCorrect === total
  return { total, firstTryCorrect, perfect, xp: firstTryCorrect * XP_PER_CORRECT + (perfect ? PERFECT_BONUS_XP : 0) }
}
