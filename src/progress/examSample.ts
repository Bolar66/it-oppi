import type { Unit } from '../schemas/content.ts'
import type { LessonItem } from '../lesson/types.ts'
import { shuffle, type Rng } from '../exercises/shuffle.ts'

/**
 * Arpoo kokeen kysymykset tasaisesti tason yksiköistä (vuorotellen yksiköstä toiseen).
 * Jos harjoituksia on vähemmän kuin count, palautetaan kaikki.
 */
export function sampleExam(pathId: string, units: readonly Unit[], count: number, rng: Rng = Math.random): LessonItem[] {
  const pools = units.map((u) => shuffle(u.exercises, rng).map((exercise) => ({ pathId, unitId: u.id, exercise })))

  const picked: LessonItem[] = []
  for (let round = 0; picked.length < count; round++) {
    let added = false
    for (const pool of pools) {
      const item = pool[round]
      if (item && picked.length < count) {
        picked.push(item)
        added = true
      }
    }
    if (!added) break
  }
  return shuffle(picked, rng)
}
