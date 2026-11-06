import { useEffect, useState } from 'react'
import type { Unit } from '../schemas/content.ts'
import { getLoadedUnit, getUnitMeta, loadUnit } from './loader.ts'

export type UnitState = { status: 'loading' } | { status: 'ready'; unit: Unit } | { status: 'error' }

/** Lataa yksikön sisällön; välimuistissa oleva palautetaan heti. */
export function useUnit(pathId: string, unitId: string): UnitState {
  const exists = !!getUnitMeta(pathId, unitId)
  const cached = getLoadedUnit(pathId, unitId)
  const [loaded, setLoaded] = useState<{ key: string; state: UnitState } | null>(null)
  const key = `${pathId}/${unitId}`

  useEffect(() => {
    if (!exists || getLoadedUnit(pathId, unitId)) return
    let cancelled = false
    loadUnit(pathId, unitId).then(
      (unit) => !cancelled && setLoaded({ key, state: { status: 'ready', unit } }),
      (e: unknown) => {
        console.error(e)
        if (!cancelled) setLoaded({ key, state: { status: 'error' } })
      },
    )
    return () => {
      cancelled = true
    }
  }, [pathId, unitId, key, exists])

  if (!exists) return { status: 'error' }
  if (cached) return { status: 'ready', unit: cached }
  if (loaded?.key === key) return loaded.state
  return { status: 'loading' }
}
