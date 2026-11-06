import type { Exercise } from '../schemas/content.ts'

/** Harjoitus viittauksineen (kertaus ja kokeet yhdistelevät harjoituksia eri yksiköistä). */
export interface LessonItem {
  pathId: string
  unitId: string
  exercise: Exercise
}

export const itemKey = (item: { unitId: string; exercise: { id: string } }) => `${item.unitId}/${item.exercise.id}`
