import { describe, expect, it } from 'vitest'
import type { Term } from '../schemas/content.ts'
import { TermsFileSchema } from '../schemas/content.ts'
import { validateContent } from '../content/validate.ts'
import type { TermItem } from '../progress/types.ts'
import { buildQuestions, recognizeQuestion, selectSessionTerms, termCounts, termKey, type TermQuestion, type TermRef } from './session.ts'
import { gradeTermQuestion, initTermRun, termReducer } from './termReducer.ts'

const term = (id: string, over: Partial<Term> = {}): Term => ({
  id,
  term: `termi-${id}`,
  definition: `määritelmä ${id}`,
  level: 1,
  unit: 'demo-1-01',
  ...over,
})
const ref = (id: string, pathId = 'demo'): TermRef => ({ pathId, term: term(id) })
const item = (id: string, box: number, dueDate: string): TermItem => ({
  key: `demo/${id}`,
  pathId: 'demo',
  termId: id,
  box,
  dueDate,
  updatedAt: '',
})
const today = '2026-11-06'

describe('TermsFileSchema ja validointi', () => {
  it('hylkää kaksoiskappaleet', () => {
    expect(TermsFileSchema.safeParse({ terms: [term('a'), term('a', { term: 'x', definition: 'y' })] }).success).toBe(false)
    expect(TermsFileSchema.safeParse({ terms: [term('a'), term('b', { term: 'TERMI-A' })] }).success).toBe(false)
    expect(TermsFileSchema.safeParse({ terms: [term('a'), term('b', { definition: 'määritelmä a' })] }).success).toBe(false)
  })

  const ex = (i: number) => ({ id: `e${i}`, type: 'multiple_choice', prompt: 'K', options: ['a', 'b'], answer: 0, explanation: 'x' })
  const files = (terms: unknown) => ({
    'paths.json': { paths: ['demo'] },
    'demo/path.json': {
      id: 'demo',
      title: 'D',
      description: 'd',
      levels: [{ level: 1, title: 'P', units: ['demo-1-01'] }],
      placementTest: { questionCount: 20, passThreshold: 0.8 },
    },
    'demo/units/demo-1-01.json': {
      id: 'demo-1-01',
      title: 'T',
      level: 1,
      theory: 't',
      exercises: Array.from({ length: 8 }, (_, i) => ex(i)),
    },
    'demo/terms.json': { terms },
  })

  it('lataa termit polulle', () => {
    const r = validateContent(files([term('a')]))
    expect(r.errors).toEqual([])
    expect(r.content.paths[0]!.terms.map((t) => t.id)).toEqual(['a'])
  })

  it('ilmoittaa tuntemattomasta yksiköstä ja väärästä tasosta', () => {
    expect(validateContent(files([term('a', { unit: 'demo-1-09' })])).errors.join()).toMatch(/yksikköä demo-1-09 ei ole/)
    expect(validateContent(files([term('a', { level: 2 })])).errors.join()).toMatch(/level 2/)
  })
})

describe('selectSessionTerms ja termCounts', () => {
  const unlocked = ['a', 'b', 'c', 'd'].map((id) => ref(id))
  const items = [item('a', 1, '2026-11-08'), item('b', 0, '2026-11-05'), item('c', 3, '2026-11-01')]

  it('ensin erääntyneet vanhimmasta, sitten uudet', () => {
    const s = selectSessionTerms(unlocked, items, today)
    expect(s.map((r) => [r.term.id, r.isNew])).toEqual([
      ['c', false],
      ['b', false],
      ['d', true],
    ])
    expect(selectSessionTerms(unlocked, items, today, 2)).toHaveLength(2)
  })

  it('laskee kerrattavat, uudet ja opitut', () => {
    expect(termCounts(unlocked, items, today)).toEqual({ due: 2, fresh: 1, learned: 1, unlocked: 4 })
  })
})

const mc = (q: TermQuestion | null) => {
  if (q?.kind !== 'recognize' || q.exercise.type !== 'multiple_choice') throw new Error('odotettiin tunnistusta')
  return q.exercise
}

describe('kysymykset', () => {
  const pool = [...['a', 'b', 'c', 'd', 'e'].map((id) => ref(id)), ref('x', 'other')]

  it('tunnistus: 4 vaihtoehtoa, oikea mukana, häiriöt ensisijaisesti samasta polusta', () => {
    const e = mc(recognizeQuestion(ref('a'), pool))
    expect(e.options).toHaveLength(4)
    expect(e.options[e.answer]).toBe('termi-a')
    expect(e.options).not.toContain('termi-x')
    expect(new Set(e.options).size).toBe(4)
  })

  it('tunnistus käyttää muita polkuja, jos oma polku ei riitä, ja palauttaa null ilman muita termejä', () => {
    const e = mc(recognizeQuestion(ref('a'), [ref('a'), ref('x', 'other')]))
    expect(e.options.sort()).toEqual(['termi-a', 'termi-x'])
    expect(recognizeQuestion(ref('a'), [ref('a')])).toBeNull()
  })

  it('tilat: kortit, tunnistus ja parit (yksinäinen liitetään edelliseen ryhmään)', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ ...ref(id), isNew: false }))
    expect(buildQuestions(six, 'card', pool).every((q) => q.kind === 'card')).toBe(true)
    expect(buildQuestions(six, 'recognize', pool).every((q) => q.kind === 'recognize')).toBe(true)
    expect(buildQuestions(six, 'pairs', pool).map((q) => q.refs.length)).toEqual([6])
    const seven = [...six, { ...ref('g'), isNew: false }]
    expect(buildQuestions(seven, 'pairs', pool).map((q) => q.refs.length)).toEqual([5, 2])
  })

  it('sekoitus: uudet kortteina ensin, tutut tunnistuksena ja pareina', () => {
    const session = [
      { ...ref('a'), isNew: true },
      ...['b', 'c', 'd', 'e'].map((id) => ({ ...ref(id), isNew: false })),
    ]
    const qs = buildQuestions(session, 'mixed', pool)
    expect(qs[0]!.kind).toBe('card')
    expect(qs.map((q) => q.kind).sort()).toEqual(['card', 'pairs', 'recognize', 'recognize'])
    expect(qs.flatMap((q) => q.refs.map(termKey)).sort()).toEqual(session.map(termKey).sort())
  })
})

describe('termReducer', () => {
  it('väärin mennyt kysytään uudelleen, firstTry säilyy ensimmäisenä', () => {
    const qs = buildQuestions([{ ...ref('a'), isNew: true }], 'card', [])
    let s = initTermRun(qs)
    s = termReducer(s, { type: 'flip' })
    expect(s.flipped).toBe(true)
    s = termReducer(s, { type: 'graded', correct: [false], requeue: qs, feedback: false })
    expect(s.phase).toBe('answering')
    expect(s.position).toBe(1)
    expect(s.flipped).toBe(false)
    s = termReducer(s, { type: 'graded', correct: [true], requeue: [], feedback: false })
    expect(s.phase).toBe('done')
    expect(s.firstTry).toEqual({ 'demo/a': false })
  })

  it('parit arvioidaan termikohtaisesti', () => {
    const [q] = buildQuestions(['a', 'b', 'c'].map((id) => ({ ...ref(id), isNew: false })), 'pairs', [])
    expect(gradeTermQuestion(q!, { type: 'match_pairs', matches: [0, 2, 1] })).toEqual([true, false, false])
  })
})
