import { getExercise } from '../content/loader.ts'
import type { LessonItem } from '../lesson/types.ts'
import type { ReviewItem } from './types.ts'

export const REVIEW_SESSION_MAX = 20

/** Erääntyneet kertausharjoitukset vanhimmasta alkaen; sisällöstä poistuneet ohitetaan. */
export function dueItems(reviewItems: readonly ReviewItem[], today: string, max = REVIEW_SESSION_MAX): LessonItem[] {
  return reviewItems
    .filter((r) => r.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.box - b.box)
    .flatMap((r) => {
      const exercise = getExercise(r.pathId, r.unitId, r.exerciseId)
      return exercise ? [{ pathId: r.pathId, unitId: r.unitId, exercise }] : []
    })
    .slice(0, max)
}

export function dueCount(reviewItems: readonly ReviewItem[], today: string): number {
  return reviewItems.filter((r) => r.dueDate <= today).length
}
