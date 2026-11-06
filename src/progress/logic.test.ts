import { describe, expect, it } from 'vitest'
import type { LoadedPath } from '../content/validate.ts'
import type { Exercise } from '../schemas/content.ts'
import { addDays, dayKey } from './dates.ts'
import { sampleExam } from './examSample.ts'
import { scheduleCorrect, scheduleWrong } from './leitner.ts'
import { activeDays, weakestUnits, xpByDay, xpOnDay } from './stats.ts'
import { computeStreaks } from './streak.ts'
import type { Attempt, ExamResult, XpEvent } from './types.ts'
import { computePathStatus } from './unlocks.ts'

describe('dates', () => {
  it('dayKey käyttää paikallista aikaa', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
  it('addDays ylittää kuukauden ja vuoden rajan', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-03-28', 7)).toBe('2026-04-04') // kesäaika
  })
})

describe('Leitner', () => {
  const today = '2026-11-06'
  it('väärä → laatikko 0, huomenna', () => {
    expect(scheduleWrong(today)).toEqual({ box: 0, dueDate: '2026-11-07' })
  })
  it('oikea siirtää laatikoissa 1 → 3 → 7 → 14 päivää ja lopuksi poistaa', () => {
    expect(scheduleCorrect(0, today)).toEqual({ box: 1, dueDate: '2026-11-09' })
    expect(scheduleCorrect(1, today)).toEqual({ box: 2, dueDate: '2026-11-13' })
    expect(scheduleCorrect(2, today)).toEqual({ box: 3, dueDate: '2026-11-20' })
    expect(scheduleCorrect(3, today)).toBeNull()
  })
})

describe('computeStreaks', () => {
  it('laskee nykyisen ja pisimmän putken', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06']
    expect(computeStreaks(days, '2026-11-06')).toEqual({ current: 2, longest: 3 })
  })
  it('putki on voimassa tänään, vaikka tänään ei ole vielä harjoiteltu', () => {
    expect(computeStreaks(['2026-11-04', '2026-11-05'], '2026-11-06').current).toBe(2)
  })
  it('katkeaa, jos eilen ei harjoiteltu', () => {
    expect(computeStreaks(['2026-11-04'], '2026-11-06').current).toBe(0)
  })
  it('tyhjä', () => {
    expect(computeStreaks([], '2026-11-06')).toEqual({ current: 0, longest: 0 })
  })
})

const ex = (id: string): Exercise => ({ id, type: 'multiple_choice', prompt: 'K', options: ['a', 'b'], answer: 0, explanation: 'x' })
const unit = (id: string, level: 1 | 2, n = 8) => ({
  id,
  title: id,
  level,
  theory: 't',
  exercises: Array.from({ length: n }, (_, i) => ex(`e${i + 1}`)),
})
const path: LoadedPath = {
  id: 'demo',
  title: 'Demo',
  description: 'd',
  levels: [
    { level: 1, title: 'Perusteet', units: ['demo-1-01', 'demo-1-02'] },
    { level: 2, title: 'Syventävä', units: ['demo-2-01'] },
  ],
  placementTest: { questionCount: 20, passThreshold: 0.8 },
  units: { 'demo-1-01': unit('demo-1-01', 1), 'demo-1-02': unit('demo-1-02', 1), 'demo-2-01': unit('demo-2-01', 2) },
  exams: {},
  terms: [],
}
const exam = (over: Partial<ExamResult>): ExamResult => ({
  id: 'x',
  pathId: 'demo',
  level: 1,
  kind: 'exam',
  score: 16,
  total: 20,
  passed: true,
  at: '',
  updatedAt: '',
  ...over,
})

describe('computePathStatus', () => {
  it('alussa vain ensimmäinen yksikkö on auki ja tasotesti tarjolla', () => {
    const s = computePathStatus(path, new Set(), [])
    expect(s.levels[0]!.units.map((u) => u.status)).toEqual(['open', 'locked'])
    expect(s.levels[1]!.unlocked).toBe(false)
    expect(s.levels[1]!.units[0]!.status).toBe('locked')
    expect(s.levels[0]!.exam.available).toBe(false)
    expect(s.placementAvailable).toBe(true)
    expect(s.next).toEqual({ kind: 'unit', unitId: 'demo-1-01' })
  })

  it('kaikki tason yksiköt suoritettu → koe aukeaa', () => {
    const s = computePathStatus(path, new Set(['demo-1-01', 'demo-1-02']), [])
    expect(s.levels[0]!.exam.available).toBe(true)
    expect(s.next).toEqual({ kind: 'exam', level: 1 })
    expect(s.levels[1]!.unlocked).toBe(false)
  })

  it('hylätty koe ei avaa tasoa 2, läpäisty avaa', () => {
    const done = new Set(['demo-1-01', 'demo-1-02'])
    const failed = computePathStatus(path, done, [exam({ score: 10, passed: false })])
    expect(failed.levels[1]!.unlocked).toBe(false)
    expect(failed.levels[0]!.exam.best).toBe(0.5)
    const passed = computePathStatus(path, done, [exam({ score: 10, passed: false }), exam({ score: 18 })])
    expect(passed.levels[1]!.unlocked).toBe(true)
    expect(passed.levels[0]!.exam.best).toBe(0.9)
    expect(passed.next).toEqual({ kind: 'unit', unitId: 'demo-2-01' })
    expect(passed.placementAvailable).toBe(false)
    expect(passed.highestUnlocked).toBe(2)
  })

  it('tasotestin läpäisy avaa tason 2', () => {
    const s = computePathStatus(path, new Set(['demo-1-01', 'demo-1-02']), [exam({ kind: 'placement' })])
    expect(s.levels[0]!.exam.passed).toBe(true)
    expect(s.levels[1]!.unlocked).toBe(true)
  })

  it('toisen polun kokeet eivät vaikuta', () => {
    const s = computePathStatus(path, new Set(['demo-1-01', 'demo-1-02']), [exam({ pathId: 'other' })])
    expect(s.levels[1]!.unlocked).toBe(false)
  })
})

describe('sampleExam', () => {
  it('ottaa tasaisesti yksiköistä ja rajaa määrän', () => {
    const items = sampleExam('demo', [path.units['demo-1-01']!, path.units['demo-1-02']!], 10)
    expect(items).toHaveLength(10)
    const perUnit = items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.unitId]: (acc[i.unitId] ?? 0) + 1 }), {})
    expect(perUnit).toEqual({ 'demo-1-01': 5, 'demo-1-02': 5 })
    expect(new Set(items.map((i) => `${i.unitId}/${i.exercise.id}`)).size).toBe(10)
  })
  it('palauttaa kaikki, jos harjoituksia on vähemmän kuin kysymyksiä', () => {
    expect(sampleExam('demo', [path.units['demo-1-01']!, path.units['demo-1-02']!], 20)).toHaveLength(16)
    expect(sampleExam('demo', [], 20)).toEqual([])
  })
})

describe('stats', () => {
  const xp = (date: string, amount: number): XpEvent => ({ id: date + amount, at: '', date, amount, source: 'lesson', ref: '', updatedAt: '' })
  const events = [xp('2026-11-06', 30), xp('2026-11-06', 20), xp('2026-11-04', 0), xp('2026-11-01', 10)]

  it('xpOnDay ja xpByDay', () => {
    expect(xpOnDay(events, '2026-11-06')).toBe(50)
    const hist = xpByDay(events, '2026-11-06', 7)
    expect(hist).toHaveLength(7)
    expect(hist[0]).toEqual({ date: '2026-10-31', xp: 0 })
    expect(hist.at(-1)).toEqual({ date: '2026-11-06', xp: 50 })
  })

  it('activeDays ohittaa 0 XP:n päivät', () => {
    expect(activeDays(events).sort()).toEqual(['2026-11-01', '2026-11-06'])
  })

  it('weakestUnits: vain tarpeeksi vastauksia, heikoin ensin, täydelliset pois', () => {
    const a = (unitId: string, correct: boolean): Attempt => ({
      id: Math.random().toString(),
      pathId: 'p',
      unitId,
      exerciseId: 'e',
      correct,
      at: '',
      context: 'lesson',
      updatedAt: '',
    })
    const attempts = [
      ...Array.from({ length: 5 }, (_, i) => a('u1', i < 4)),
      ...Array.from({ length: 6 }, (_, i) => a('u2', i < 2)),
      ...Array.from({ length: 3 }, () => a('u3', false)),
      ...Array.from({ length: 5 }, () => a('u4', true)),
    ]
    expect(weakestUnits(attempts).map((w) => [w.unitId, w.accuracy])).toEqual([
      ['u2', 2 / 6],
      ['u1', 0.8],
    ])
  })
})
