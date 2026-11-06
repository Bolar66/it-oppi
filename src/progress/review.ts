import { getUnitMeta, loadUnit } from '../content/loader.ts'
import type { LessonItem } from '../lesson/types.ts'
import type { ReviewItem } from './types.ts'

export const REVIEW_SESSION_MAX = 20

/** Erääntyneet kertausviitteet vanhimmasta alkaen; sisällöstä poistuneet yksiköt ohitetaan. */
export function dueReviewItems(reviewItems: readonly ReviewItem[], today: string): ReviewItem[] {
  return reviewItems
    .filter((r) => r.dueDate <= today && getUnitMeta(r.pathId, r.unitId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.box - b.box)
}

export function dueCount(reviewItems: readonly ReviewItem[], today: string): number {
  return dueReviewItems(reviewItems, today).length
}

/** Lataa kertauskierroksen harjoitukset (enintään max); sisällöstä poistuneet harjoitukset ohitetaan. */
export async function loadDueItems(reviewItems: readonly ReviewItem[], today: string, max = REVIEW_SESSION_MAX): Promise<LessonItem[]> {
  const due = dueReviewItems(reviewItems, today)
  const items: LessonItem[] = []
  for (const r of due) {
    if (items.length >= max) break
    const unit = await loadUnit(r.pathId, r.unitId)
    const exercise = unit.exercises.find((e) => e.id === r.exerciseId)
    if (exercise) items.push({ pathId: r.pathId, unitId: r.unitId, exercise })
  }
  return items
}
