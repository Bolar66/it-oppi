import type { LoadedPath } from '../content/validate.ts'
import type { Level } from '../schemas/content.ts'
import type { LessonItem } from '../lesson/types.ts'
import { shuffle, type Rng } from '../exercises/shuffle.ts'

/**
 * Arpoo kokeen kysymykset tasaisesti tason yksiköistä (vuorotellen yksiköstä toiseen).
 * Jos harjoituksia on vähemmän kuin count, palautetaan kaikki.
 */
export function sampleExam(path: LoadedPath, level: Level, count: number, rng: Rng = Math.random): LessonItem[] {
  const lvl = path.levels.find((l) => l.level === level)
  if (!lvl) return []
  const pools = lvl.units
    .map((unitId) => path.units[unitId])
    .filter((u) => u !== undefined)
    .map((u) => shuffle(u.exercises, rng).map((exercise) => ({ pathId: path.id, unitId: u.id, exercise })))

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
