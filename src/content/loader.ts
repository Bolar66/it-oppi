import index from 'virtual:content-index'
import { UnitSchema, type Exercise, type Unit } from '../schemas/content.ts'
import type { ContentIndex, PathIndex, UnitMeta } from './contentIndex.ts'

/**
 * Sisällön lataus kahdessa osassa:
 * 1. Indeksi (polut, termit, kokeet, yksiköiden otsikot) on käynnistyskoodissa; se on validoitu buildissa.
 * 2. Yksiköiden teoria ja harjoitukset ovat omia palojaan, jotka ladataan tarvittaessa ja validoidaan
 *    latauksessa. PWA esilataa kaikki palat, joten offline-käyttö toimii.
 */
export const content: ContentIndex = index

const unitModules = import.meta.glob<unknown>('/content/*/units/*.json', { import: 'default' })
const cache = new Map<string, Unit>()
const key = (pathId: string, unitId: string) => `${pathId}/${unitId}`

export function getPath(pathId: string): PathIndex | undefined {
  return content.paths.find((p) => p.id === pathId)
}

export function getUnitMeta(pathId: string, unitId: string): UnitMeta | undefined {
  return getPath(pathId)?.units[unitId]
}

/** Lataa yksikön sisällön (välimuistiin). Hylkää, jos yksikköä ei ole tai se ei läpäise skeemaa. */
export async function loadUnit(pathId: string, unitId: string): Promise<Unit> {
  const cached = cache.get(key(pathId, unitId))
  if (cached) return cached
  const load = getUnitMeta(pathId, unitId) && unitModules[`/content/${pathId}/units/${unitId}.json`]
  if (!load) throw new Error(`Yksikköä ${pathId}/${unitId} ei ole`)
  const unit = UnitSchema.parse(await load())
  cache.set(key(pathId, unitId), unit)
  return unit
}

export function loadUnits(pathId: string, unitIds: readonly string[]): Promise<Unit[]> {
  return Promise.all(unitIds.map((u) => loadUnit(pathId, u)))
}

/** Jo ladattu yksikkö (synkroninen), esim. kertauksen teoria kesken kierroksen. */
export function getLoadedUnit(pathId: string, unitId: string): Unit | undefined {
  return cache.get(key(pathId, unitId))
}

export function getLoadedExercise(pathId: string, unitId: string, exerciseId: string): Exercise | undefined {
  return getLoadedUnit(pathId, unitId)?.exercises.find((e) => e.id === exerciseId)
}
