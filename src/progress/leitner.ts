import { addDays } from './dates.ts'

/** Laatikoiden kertausvälit päivinä. Laatikko 0 = 1 pv, 1 = 3 pv, 2 = 7 pv, 3 = 14 pv. */
export const LEITNER_INTERVALS = [1, 3, 7, 14] as const
export const LAST_BOX = LEITNER_INTERVALS.length - 1

export interface Schedule {
  box: number
  dueDate: string
}

/** Väärä vastaus: ensimmäiseen laatikkoon, kertaus huomenna. */
export function scheduleWrong(today: string): Schedule {
  return { box: 0, dueDate: addDays(today, LEITNER_INTERVALS[0]) }
}

/** Termit: oikea vastaus viimeisessä laatikossa pitää termin 14 päivän kierrossa (ei poistu). */
export function scheduleTermCorrect(box: number, today: string): Schedule {
  return scheduleCorrect(box, today) ?? { box: LAST_BOX, dueDate: addDays(today, LEITNER_INTERVALS[LAST_BOX]!) }
}

/** Oikea vastaus kertauksessa: seuraavaan laatikkoon, tai null = harjoitus poistuu jonosta. */
export function scheduleCorrect(box: number, today: string): Schedule | null {
  const next = box + 1
  if (next > LAST_BOX) return null
  return { box: next, dueDate: addDays(today, LEITNER_INTERVALS[next]!) }
}
