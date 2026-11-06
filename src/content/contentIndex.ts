import type { Level } from '../schemas/content.ts'
import type { ContentTree, LoadedPath } from './validate.ts'

/** Yksikön kevyet tiedot indeksissä (teoria ja harjoitukset ladataan erikseen). */
export interface UnitMeta {
  id: string
  title: string
  level: Level
  exerciseCount: number
}

/** Polku indeksissä: kaikki paitsi yksiköiden sisältö. */
export interface PathIndex extends Omit<LoadedPath, 'units'> {
  units: Record<string, UnitMeta>
}

export interface ContentIndex {
  paths: PathIndex[]
}

/** Täydestä (validoidusta) sisällöstä kevyt indeksi, joka niputetaan sovelluksen käynnistyskoodiin. */
export function toIndex(content: ContentTree): ContentIndex {
  return {
    paths: content.paths.map((p) => ({
      ...p,
      units: Object.fromEntries(
        Object.values(p.units).map((u) => [
          u.id,
          { id: u.id, title: u.title, level: u.level, exerciseCount: u.exercises.length },
        ]),
      ),
    })),
  }
}
