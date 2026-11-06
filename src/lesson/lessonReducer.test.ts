import { describe, expect, it } from 'vitest'
import type { Exercise } from '../schemas/content.ts'
import { currentExercise, initLesson, lessonReducer, summarize, type LessonAction, type LessonState } from './lessonReducer.ts'

const mc = (id: string, answer: number): Exercise => ({
  id,
  type: 'multiple_choice',
  prompt: 'K',
  options: ['a', 'b'],
  answer,
  explanation: 'x',
})
const exercises = [mc('e1', 0), mc('e2', 1), mc('e3', 0)]

const run = (state: LessonState, ...actions: LessonAction[]) => actions.reduce(lessonReducer, state)
const choose = (choice: number): LessonAction => ({ type: 'answer', answer: { type: 'multiple_choice', choice } })
const check: LessonAction = { type: 'check' }
const next: LessonAction = { type: 'continue' }

describe('lessonReducer', () => {
  it('ei tarkista keskeneräistä vastausta', () => {
    const s = run(initLesson(exercises), check)
    expect(s.phase).toBe('answering')
  })

  it('virheetön oppitunti: kaikki oikein ensimmäisellä', () => {
    const s = run(initLesson(exercises), choose(0), check, next, choose(1), check, next, choose(0), check, next)
    expect(s.phase).toBe('done')
    expect(summarize(s)).toEqual({ total: 3, firstTryCorrect: 3, perfect: true, xp: 50 })
  })

  it('väärin mennyt kysytään uudelleen lopussa, XP vain 1. yrityksistä', () => {
    let s = run(initLesson(exercises), choose(1), check)
    expect(s.lastCorrect).toBe(false)
    expect(s.queue).toEqual([0, 1, 2, 0])
    expect(s.solved).toBe(0)
    s = run(s, next, choose(1), check, next, choose(0), check, next)
    expect(s.phase).toBe('answering')
    expect(currentExercise(s).id).toBe('e1')
    s = run(s, choose(0), check)
    expect(s.solved).toBe(3)
    s = run(s, next)
    expect(s.phase).toBe('done')
    expect(summarize(s)).toEqual({ total: 3, firstTryCorrect: 2, perfect: false, xp: 20 })
  })

  it('uusi kysymys alkaa tyhjällä vastauksella ja uudella attempt-avaimella', () => {
    const s = run(initLesson(exercises), choose(0), check, next)
    expect(s.answer).toEqual({ type: 'multiple_choice', choice: null })
    expect(s.attempt).toBe(1)
  })

  it('vastausta ei voi muuttaa tarkistuksen jälkeen', () => {
    const s = run(initLesson(exercises), choose(1), check, choose(0))
    expect(s.answer).toEqual({ type: 'multiple_choice', choice: 1 })
  })

  it('initLesson vaatii harjoituksia', () => {
    expect(() => initLesson([])).toThrow()
  })
})
