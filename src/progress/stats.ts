import { addDays } from './dates.ts'
import type { Attempt, XpEvent } from './types.ts'

export function xpOnDay(events: readonly XpEvent[], day: string): number {
  return events.reduce((sum, e) => (e.date === day ? sum + e.amount : sum), 0)
}

/** XP päivittäin viimeiseltä `days` päivältä, vanhin ensin. */
export function xpByDay(events: readonly XpEvent[], today: string, days = 14): { date: string; xp: number }[] {
  const totals = new Map<string, number>()
  for (const e of events) totals.set(e.date, (totals.get(e.date) ?? 0) + e.amount)
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1)
    return { date, xp: totals.get(date) ?? 0 }
  })
}

export function activeDays(events: readonly XpEvent[]): string[] {
  return [...new Set(events.filter((e) => e.amount > 0).map((e) => e.date))]
}

export interface WeakUnit {
  pathId: string
  unitId: string
  attempts: number
  accuracy: number
}

/** Heikoimmat yksiköt vastausten tarkkuuden mukaan (vain yksiköt, joista on tarpeeksi vastauksia). */
export function weakestUnits(attempts: readonly Attempt[], minAttempts = 5, limit = 5): WeakUnit[] {
  const byUnit = new Map<string, { pathId: string; total: number; correct: number }>()
  for (const a of attempts) {
    const s = byUnit.get(a.unitId) ?? { pathId: a.pathId, total: 0, correct: 0 }
    s.total++
    if (a.correct) s.correct++
    byUnit.set(a.unitId, s)
  }
  return [...byUnit.entries()]
    .filter(([, s]) => s.total >= minAttempts)
    .map(([unitId, s]) => ({ unitId, pathId: s.pathId, attempts: s.total, accuracy: s.correct / s.total }))
    .filter((u) => u.accuracy < 1)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, limit)
}
