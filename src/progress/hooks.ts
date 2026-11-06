import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { LoadedPath } from '../content/validate.ts'
import { db } from './db.ts'
import { DEFAULT_DAILY_GOAL } from './xp.ts'
import type { ExamResult, ReviewItem, UnitProgress, XpEvent } from './types.ts'
import { computePathStatus, type PathStatus } from './unlocks.ts'

export interface ProgressSnapshot {
  xpEvents: XpEvent[]
  unitProgress: UnitProgress[]
  examResults: ExamResult[]
  reviewItems: ReviewItem[]
  dailyGoal: number
  lastPathId: string | null
  completed: Set<string>
}

/** Kaikki pienet edistymistaulut yhdellä reaktiivisella kyselyllä. undefined = latautuu. */
export function useProgress(): ProgressSnapshot | undefined {
  return useLiveQuery(async () => {
    const [xpEvents, unitProgress, examResults, reviewItems, settings] = await Promise.all([
      db.xpEvents.toArray(),
      db.unitProgress.toArray(),
      db.examResults.toArray(),
      db.reviewItems.toArray(),
      db.settings.toArray(),
    ])
    const setting = (key: string) => settings.find((s) => s.key === key)?.value
    const goal = setting('dailyGoal')
    const last = setting('lastPathId')
    return {
      xpEvents,
      unitProgress,
      examResults,
      reviewItems,
      dailyGoal: typeof goal === 'number' ? goal : DEFAULT_DAILY_GOAL,
      lastPathId: typeof last === 'string' ? last : null,
      completed: new Set(unitProgress.filter((u) => u.completedAt).map((u) => u.unitId)),
    }
  }, [])
}

export function usePathStatus(path: LoadedPath | undefined, progress: ProgressSnapshot | undefined): PathStatus | undefined {
  return useMemo(
    () => (path && progress ? computePathStatus(path, progress.completed, progress.examResults) : undefined),
    [path, progress],
  )
}
