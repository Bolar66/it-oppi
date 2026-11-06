import { addDays } from './dates.ts'

export interface Streaks {
  current: number
  longest: number
}

/**
 * Putki = peräkkäiset päivät, joina on ansaittu XP:tä.
 * Nykyinen putki on voimassa vielä tänään, vaikka tänään ei olisi vielä harjoiteltu.
 */
export function computeStreaks(activeDays: Iterable<string>, today: string): Streaks {
  const days = new Set(activeDays)
  let current = 0
  let d = days.has(today) ? today : addDays(today, -1)
  while (days.has(d)) {
    current++
    d = addDays(d, -1)
  }

  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const day of [...days].sort()) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = day
  }
  return { current, longest }
}
