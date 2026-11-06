import { validateContent, type ContentTree, type LoadedPath } from './validate.ts'
import type { Exercise, Unit } from '../schemas/content.ts'

const PREFIX = '/content/'

/** Kaikki content/-kansion JSON-tiedostot niputetaan buildiin (toimii offline). */
const modules = import.meta.glob<unknown>('/content/**/*.json', { eager: true, import: 'default' })

export function filesFromGlob(mods: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(mods).map(([key, value]) => [key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key, value]),
  )
}

function load(): ContentTree {
  const { content, errors } = validateContent(filesFromGlob(modules))
  if (errors.length > 0) {
    throw new Error(`Sisällön validointi epäonnistui:\n${errors.join('\n')}`)
  }
  return content
}

export const content: ContentTree = load()

export function getPath(pathId: string): LoadedPath | undefined {
  return content.paths.find((p) => p.id === pathId)
}

export function getUnit(pathId: string, unitId: string): Unit | undefined {
  return getPath(pathId)?.units[unitId]
}

export function getExercise(pathId: string, unitId: string, exerciseId: string): Exercise | undefined {
  return getUnit(pathId, unitId)?.exercises.find((e) => e.id === exerciseId)
}
