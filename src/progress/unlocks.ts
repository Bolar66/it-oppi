import type { LoadedPath } from '../content/validate.ts'
import type { Level } from '../schemas/content.ts'
import type { ExamResult } from './types.ts'

export const DEFAULT_TEST = { questionCount: 20, passThreshold: 0.8 }

export type UnitStatus = 'locked' | 'open' | 'completed'

export interface LevelStatus {
  level: Level
  title: string
  unlocked: boolean
  units: { unitId: string; status: UnitStatus }[]
  allCompleted: boolean
  exam: {
    /** Koe on tehtävissä (taso auki ja kaikki yksiköt suoritettu). */
    available: boolean
    passed: boolean
    /** Paras tulos 0–1 tai null. */
    best: number | null
    questionCount: number
    passThreshold: number
  }
}

export type NextStep =
  | { kind: 'unit'; unitId: string }
  | { kind: 'exam'; level: Level }
  | { kind: 'done' }

export interface PathStatus {
  levels: LevelStatus[]
  /** Tasotesti (tason 1 ohitus) on tarjolla. */
  placementAvailable: boolean
  next: NextStep
  completedUnits: number
  totalUnits: number
  /** Korkein avattu taso. */
  highestUnlocked: Level
}

/**
 * Avaussäännöt: tason ensimmäinen yksikkö on auki, seuraava aukeaa edellisen suorituksella.
 * Taso n+1 aukeaa, kun tason n koe on läpäisty (tasotestin läpäisy = tason 1 koe läpäisty).
 */
export function computePathStatus(path: LoadedPath, completed: ReadonlySet<string>, exams: readonly ExamResult[]): PathStatus {
  const own = exams.filter((e) => e.pathId === path.id)
  const placementPassed = own.some((e) => e.kind === 'placement' && e.passed)
  const levels: LevelStatus[] = []
  let previousPassed = true

  for (const lvl of [...path.levels].sort((a, b) => a.level - b.level)) {
    const unlocked = previousPassed
    let prevDone = true
    const units = lvl.units.map((unitId) => {
      const done = completed.has(unitId)
      const status: UnitStatus = done ? 'completed' : unlocked && prevDone ? 'open' : 'locked'
      prevDone = done
      return { unitId, status }
    })
    const allCompleted = units.every((u) => u.status === 'completed')
    const results = own.filter((e) => e.kind === 'exam' && e.level === lvl.level)
    const passed = results.some((e) => e.passed) || (lvl.level === 1 && placementPassed)
    const best = results.length ? Math.max(...results.map((e) => e.score / e.total)) : null
    const cfg = path.exams[lvl.level] ?? DEFAULT_TEST
    levels.push({
      level: lvl.level,
      title: lvl.title,
      unlocked,
      units,
      allCompleted,
      exam: {
        available: unlocked && allCompleted && units.length > 0,
        passed,
        best,
        questionCount: cfg.questionCount,
        passThreshold: cfg.passThreshold,
      },
    })
    previousPassed = passed
  }

  const level1 = levels.find((l) => l.level === 1)
  const placementAvailable = !!level1 && !level1.exam.passed && level1.units.length > 0

  let next: NextStep = { kind: 'done' }
  for (const l of levels) {
    if (!l.unlocked) break
    const open = l.units.find((u) => u.status === 'open')
    if (open) {
      next = { kind: 'unit', unitId: open.unitId }
      break
    }
    if (l.exam.available && !l.exam.passed) {
      next = { kind: 'exam', level: l.level }
      break
    }
  }

  const all = levels.flatMap((l) => l.units)
  return {
    levels,
    placementAvailable,
    next,
    completedUnits: all.filter((u) => u.status === 'completed').length,
    totalUnits: all.length,
    highestUnlocked: [...levels].reverse().find((l) => l.unlocked)?.level ?? 1,
  }
}
