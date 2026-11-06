import { describe, expect, it } from 'vitest'
import type { Exercise } from '../schemas/content.ts'
import type { LessonItem } from '../lesson/types.ts'
import { db } from './db.ts'
import {
  addReport,
  exportData,
  importData,
  LEGACY_REPORTS_KEY,
  migrateLegacyReports,
  parseExport,
  recordExam,
  recordLesson,
} from './repo.ts'

const NOW = new Date(2026, 10, 6, 12, 0)
const ex = (id: string): Exercise => ({ id, type: 'multiple_choice', prompt: 'K', options: ['a', 'b'], answer: 0, explanation: 'x' })
const items: LessonItem[] = ['e1', 'e2', 'e3'].map((id) => ({ pathId: 'python', unitId: 'python-1-01', exercise: ex(id) }))

describe('recordLesson', () => {
  it('tallentaa XP:n, vastaukset, yksikön suorituksen ja väärät kertausjonoon', async () => {
    await recordLesson(
      {
        mode: 'lesson',
        items,
        firstTry: [true, false, true],
        log: [
          { index: 0, correct: true },
          { index: 1, correct: false },
          { index: 2, correct: true },
          { index: 1, correct: true },
        ],
        xp: 20,
      },
      NOW,
    )
    expect(await db.xpEvents.toArray()).toMatchObject([{ amount: 20, date: '2026-11-06', source: 'lesson', ref: 'python-1-01' }])
    expect(await db.attempts.count()).toBe(4)
    expect(await db.unitProgress.get('python-1-01')).toMatchObject({ timesCompleted: 1, bestFirstTry: 2, total: 3 })
    expect(await db.reviewItems.toArray()).toMatchObject([{ key: 'python-1-01/e2', box: 0, dueDate: '2026-11-07' }])
    expect(await db.settings.get('lastPathId')).toMatchObject({ value: 'python' })

    // Toinen suoritus: completedAt säilyy, paras tulos päivittyy.
    const first = (await db.unitProgress.get('python-1-01'))!.completedAt
    await recordLesson({ mode: 'lesson', items, firstTry: [true, true, true], log: [], xp: 50 }, new Date(2026, 10, 7))
    expect(await db.unitProgress.get('python-1-01')).toMatchObject({ completedAt: first, timesCompleted: 2, bestFirstTry: 3 })
  })

  it('kertaus: oikea siirtää laatikkoa, väärä palauttaa alkuun, viimeisestä laatikosta poistuu', async () => {
    const base = { pathId: 'python', unitId: 'python-1-01', updatedAt: '' }
    await db.reviewItems.bulkAdd([
      { ...base, key: 'python-1-01/e1', exerciseId: 'e1', box: 0, dueDate: '2026-11-06' },
      { ...base, key: 'python-1-01/e2', exerciseId: 'e2', box: 2, dueDate: '2026-11-06' },
      { ...base, key: 'python-1-01/e3', exerciseId: 'e3', box: 3, dueDate: '2026-11-06' },
    ])
    await recordLesson({ mode: 'review', items, firstTry: [true, false, true], log: [], xp: 20 }, NOW)
    expect(await db.reviewItems.get('python-1-01/e1')).toMatchObject({ box: 1, dueDate: '2026-11-09' })
    expect(await db.reviewItems.get('python-1-01/e2')).toMatchObject({ box: 0, dueDate: '2026-11-07' })
    expect(await db.reviewItems.get('python-1-01/e3')).toBeUndefined()
    expect(await db.unitProgress.count()).toBe(0)
    expect(await db.xpEvents.toArray()).toMatchObject([{ source: 'review', amount: 20 }])
  })
})

describe('recordExam', () => {
  it('hylätty koe: tulos, XP oikeista ja väärät kertaukseen', async () => {
    const r = await recordExam(
      { kind: 'exam', pathId: 'python', level: 1, items, correct: [true, false, false], passThreshold: 0.8 },
      NOW,
    )
    expect(r).toMatchObject({ score: 1, total: 3, passed: false })
    expect(await db.xpEvents.toArray()).toMatchObject([{ amount: 10, source: 'exam', ref: 'python/level-1' }])
    expect(await db.reviewItems.count()).toBe(2)
    expect(await db.attempts.count()).toBe(3)
  })

  it('läpäisty tasotesti merkitsee yksiköt suoritetuiksi', async () => {
    const r = await recordExam(
      {
        kind: 'placement',
        pathId: 'python',
        level: 1,
        items,
        correct: [true, true, true],
        passThreshold: 0.8,
        unitsOnPass: ['python-1-01', 'python-1-02'],
      },
      NOW,
    )
    expect(r.passed).toBe(true)
    expect(await db.unitProgress.toArray()).toMatchObject([
      { unitId: 'python-1-01', viaPlacement: true },
      { unitId: 'python-1-02', viaPlacement: true },
    ])
  })

  it('hylätty tasotesti ei merkitse mitään', async () => {
    await recordExam(
      { kind: 'placement', pathId: 'python', level: 1, items, correct: [true, false, false], passThreshold: 0.8, unitsOnPass: ['python-1-01'] },
      NOW,
    )
    expect(await db.unitProgress.count()).toBe(0)
  })
})

describe('vienti ja tuonti', () => {
  it('vienti → tyhjennys → tuonti palauttaa saman datan', async () => {
    await recordLesson({ mode: 'lesson', items, firstTry: [true, false, true], log: [{ index: 0, correct: true }], xp: 20 }, NOW)
    await addReport({ pathId: 'python', unitId: 'python-1-01', exerciseId: 'e1', message: 'm' })
    const file = await exportData(NOW)
    const text = JSON.stringify(file)

    await recordExam({ kind: 'exam', pathId: 'python', level: 1, items, correct: [true, true, true], passThreshold: 0.8 }, NOW)
    const parsed = parseExport(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await importData(parsed.file)
    expect(await exportData(NOW)).toEqual(file)
    expect(await db.examResults.count()).toBe(0)
  })

  it('hylkää virheellisen tiedoston', () => {
    expect(parseExport('ei json')).toMatchObject({ ok: false })
    expect(parseExport(JSON.stringify({ app: 'muu' }))).toMatchObject({ ok: false })
    expect(
      parseExport(JSON.stringify({ app: 'it-oppi', version: 1, exportedAt: 'x', data: { xpEvents: [{ id: 1 }] } })),
    ).toMatchObject({ ok: false })
  })
})

describe('migrateLegacyReports', () => {
  it('siirtää vaiheen 2 localStorage-ilmoitukset ja poistaa avaimen', async () => {
    localStorage.setItem(
      LEGACY_REPORTS_KEY,
      JSON.stringify([{ id: 'r1', pathId: 'python', unitId: 'python-1-01', exerciseId: 'e1', message: 'vanha', createdAt: '2026-11-01T10:00:00.000Z' }]),
    )
    expect(await migrateLegacyReports()).toBe(1)
    expect(await db.errorReports.toArray()).toMatchObject([{ id: 'r1', message: 'vanha', updatedAt: '2026-11-01T10:00:00.000Z' }])
    expect(localStorage.getItem(LEGACY_REPORTS_KEY)).toBeNull()
    expect(await migrateLegacyReports()).toBe(0)
  })
})
