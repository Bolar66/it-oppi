import { z } from 'zod'

/**
 * "Ilmoita virheestä" -ilmoitukset.
 * Väliaikaisesti localStoragessa; siirretään IndexedDB:hen vaiheessa 3.
 */
export const STORAGE_KEY = 'it-oppi:error-reports'

export const ErrorReportSchema = z.object({
  id: z.string(),
  pathId: z.string(),
  unitId: z.string(),
  exerciseId: z.string(),
  message: z.string(),
  createdAt: z.string(),
})
export type ErrorReport = z.infer<typeof ErrorReportSchema>

export function loadReports(): ErrorReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = z.array(ErrorReportSchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

function save(reports: ErrorReport[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function addReport(input: Omit<ErrorReport, 'id' | 'createdAt'>): ErrorReport {
  const report: ErrorReport = { ...input, id: newId(), createdAt: new Date().toISOString() }
  save([...loadReports(), report])
  return report
}

export function removeReport(id: string): ErrorReport[] {
  const next = loadReports().filter((r) => r.id !== id)
  save(next)
  return next
}
