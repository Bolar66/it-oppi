import type { Level } from '../schemas/content.ts'
import { itemKey, type LessonItem } from '../lesson/types.ts'
import { db, TABLE_NAMES } from './db.ts'
import { dayKey } from './dates.ts'
import { scheduleCorrect, scheduleWrong } from './leitner.ts'
import {
  ExportFileSchema,
  type Activity,
  type Attempt,
  type ErrorReport,
  type ExamResult,
  type ExportFile,
  type UnitProgress,
} from './types.ts'

import { XP_PER_CORRECT } from './xp.ts'

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function attemptsFor(items: readonly LessonItem[], log: readonly { index: number; correct: boolean }[], context: Activity, at: string): Attempt[] {
  return log.map(({ index, correct }) => {
    const item = items[index]!
    return {
      id: newId(),
      pathId: item.pathId,
      unitId: item.unitId,
      exerciseId: item.exercise.id,
      correct,
      at,
      context,
      updatedAt: at,
    }
  })
}

export interface LessonOutcome {
  mode: 'lesson' | 'review'
  items: LessonItem[]
  /** Menikö items[i] oikein ensimmäisellä yrityksellä. */
  firstTry: boolean[]
  /** Kaikki vastaukset järjestyksessä (myös uusinnat). */
  log: { index: number; correct: boolean }[]
  xp: number
}

/** Tallentaa loppuun viedyn oppitunnin tai kertauksen. */
export async function recordLesson(o: LessonOutcome, now = new Date()): Promise<void> {
  const at = now.toISOString()
  const today = dayKey(now)
  const first = o.items[0]
  if (!first) return

  await db.transaction('rw', [db.xpEvents, db.attempts, db.unitProgress, db.reviewItems, db.settings], async () => {
    await db.xpEvents.add({ id: newId(), at, date: today, amount: o.xp, source: o.mode, ref: o.mode === 'lesson' ? first.unitId : 'review', updatedAt: at })
    await db.attempts.bulkAdd(attemptsFor(o.items, o.log, o.mode, at))

    for (const [i, item] of o.items.entries()) {
      const key = itemKey(item)
      const base = { key, pathId: item.pathId, unitId: item.unitId, exerciseId: item.exercise.id, updatedAt: at }
      if (o.mode === 'lesson') {
        if (!o.firstTry[i]) await db.reviewItems.put({ ...base, ...scheduleWrong(today) })
      } else if (o.firstTry[i]) {
        const existing = await db.reviewItems.get(key)
        const next = scheduleCorrect(existing?.box ?? 0, today)
        if (next) await db.reviewItems.put({ ...base, ...next })
        else await db.reviewItems.delete(key)
      } else {
        await db.reviewItems.put({ ...base, ...scheduleWrong(today) })
      }
    }

    if (o.mode === 'lesson') {
      const existing = await db.unitProgress.get(first.unitId)
      const firstTryCorrect = o.firstTry.filter(Boolean).length
      await db.unitProgress.put({
        unitId: first.unitId,
        pathId: first.pathId,
        completedAt: existing?.completedAt ?? at,
        timesCompleted: (existing?.timesCompleted ?? 0) + 1,
        bestFirstTry: Math.max(existing?.bestFirstTry ?? 0, firstTryCorrect),
        total: o.items.length,
        lastPracticedAt: at,
        viaPlacement: existing?.viaPlacement ?? false,
        updatedAt: at,
      })
    }
    await db.settings.put({ key: 'lastPathId', value: first.pathId, updatedAt: at })
  })
}

export interface ExamOutcome {
  kind: 'exam' | 'placement'
  pathId: string
  level: Level
  items: LessonItem[]
  correct: boolean[]
  passThreshold: number
  /** Tasotestin läpäisy merkitsee nämä yksiköt suoritetuiksi. */
  unitsOnPass?: string[]
}

export async function recordExam(o: ExamOutcome, now = new Date()): Promise<ExamResult> {
  const at = now.toISOString()
  const today = dayKey(now)
  const score = o.correct.filter(Boolean).length
  const total = Math.max(1, o.items.length)
  const result: ExamResult = {
    id: newId(),
    pathId: o.pathId,
    level: o.level,
    kind: o.kind,
    score,
    total,
    passed: score / total >= o.passThreshold,
    at,
    updatedAt: at,
  }

  await db.transaction('rw', [db.examResults, db.xpEvents, db.attempts, db.reviewItems, db.unitProgress, db.settings], async () => {
    await db.examResults.add(result)
    await db.xpEvents.add({
      id: newId(),
      at,
      date: today,
      amount: score * XP_PER_CORRECT,
      source: o.kind,
      ref: `${o.pathId}/level-${o.level}`,
      updatedAt: at,
    })
    await db.attempts.bulkAdd(attemptsFor(o.items, o.correct.map((correct, index) => ({ index, correct })), o.kind, at))
    for (const [i, item] of o.items.entries()) {
      if (o.correct[i]) continue
      await db.reviewItems.put({
        key: itemKey(item),
        pathId: item.pathId,
        unitId: item.unitId,
        exerciseId: item.exercise.id,
        ...scheduleWrong(today),
        updatedAt: at,
      })
    }
    if (result.passed && o.unitsOnPass) {
      for (const unitId of o.unitsOnPass) {
        const existing = await db.unitProgress.get(unitId)
        if (existing?.completedAt) continue
        const progress: UnitProgress = {
          unitId,
          pathId: o.pathId,
          completedAt: at,
          timesCompleted: existing?.timesCompleted ?? 0,
          bestFirstTry: existing?.bestFirstTry ?? 0,
          total: existing?.total ?? 0,
          lastPracticedAt: existing?.lastPracticedAt ?? null,
          viaPlacement: true,
          updatedAt: at,
        }
        await db.unitProgress.put(progress)
      }
    }
    await db.settings.put({ key: 'lastPathId', value: o.pathId, updatedAt: at })
  })
  return result
}

export async function setDailyGoal(xp: number): Promise<void> {
  await db.settings.put({ key: 'dailyGoal', value: xp, updatedAt: new Date().toISOString() })
}

// --- Virheilmoitukset ---

export async function addReport(input: Pick<ErrorReport, 'pathId' | 'unitId' | 'exerciseId' | 'message'>): Promise<ErrorReport> {
  const at = new Date().toISOString()
  const report: ErrorReport = { ...input, id: newId(), createdAt: at, updatedAt: at }
  await db.errorReports.add(report)
  return report
}

export async function removeReport(id: string): Promise<void> {
  await db.errorReports.delete(id)
}

/** Vaiheen 2 localStorage-ilmoitukset siirretään IndexedDB:hen (kerran). */
export const LEGACY_REPORTS_KEY = 'it-oppi:error-reports'

export async function migrateLegacyReports(): Promise<number> {
  let raw: string | null
  try {
    raw = localStorage.getItem(LEGACY_REPORTS_KEY)
  } catch {
    return 0
  }
  if (!raw) return 0
  let moved = 0
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const reports = parsed
        .filter((r): r is Omit<ErrorReport, 'updatedAt'> => typeof r === 'object' && r !== null && 'id' in r && 'message' in r)
        .map((r) => ({ ...r, updatedAt: r.createdAt }))
      await db.errorReports.bulkPut(reports)
      moved = reports.length
    }
  } catch {
    // Rikkinäinen data: ei siirrettävää.
  }
  localStorage.removeItem(LEGACY_REPORTS_KEY)
  return moved
}

// --- Vienti ja tuonti ---

export async function exportData(now = new Date()): Promise<ExportFile> {
  const [xpEvents, attempts, unitProgress, examResults, reviewItems, errorReports, settings] = await Promise.all(
    TABLE_NAMES.map((t) => db.table(t).toArray()),
  )
  return {
    app: 'it-oppi',
    version: 1,
    exportedAt: now.toISOString(),
    data: { xpEvents, attempts, unitProgress, examResults, reviewItems, errorReports, settings } as ExportFile['data'],
  }
}

export type ParseResult = { ok: true; file: ExportFile } | { ok: false; error: string }

export function parseExport(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Tiedosto ei ole kelvollista JSONia.' }
  }
  const r = ExportFileSchema.safeParse(json)
  if (!r.success) {
    const issue = r.error.issues[0]
    return { ok: false, error: `Tiedosto ei ole IT-oppi-vienti (${issue?.path.join('.') || 'juuri'}: ${issue?.message}).` }
  }
  return { ok: true, file: r.data }
}

/** Korvaa kaiken nykyisen datan tiedoston sisällöllä. */
export async function importData(file: ExportFile): Promise<void> {
  await db.transaction('rw', TABLE_NAMES.map((t) => db.table(t)), async () => {
    for (const name of TABLE_NAMES) {
      await db.table(name).clear()
      await db.table(name).bulkAdd(file.data[name])
    }
  })
}

export async function clearAllData(): Promise<void> {
  await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()))
}
