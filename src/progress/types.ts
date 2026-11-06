import { z } from 'zod'
import { LevelSchema } from '../schemas/content.ts'

/**
 * Edistymisdatan tietueet. Jokaisella on pysyvä id ja updatedAt, jotta vaiheen 5
 * synkka voi yhdistää laitteiden datan ("uusin voittaa").
 * Samoja skeemoja käytetään JSON-tuonnin validointiin.
 */

const isoTime = z.string().min(1)
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const ActivitySchema = z.enum(['lesson', 'review', 'exam', 'placement'])
export type Activity = z.infer<typeof ActivitySchema>

export const XpEventSchema = z.object({
  id: z.string(),
  at: isoTime,
  /** Paikallinen päivä YYYY-MM-DD. */
  date: dayKey,
  amount: z.int().min(0),
  source: ActivitySchema,
  /** Yksikön id tai "<polku>/level-<n>". */
  ref: z.string(),
  updatedAt: isoTime,
})
export type XpEvent = z.infer<typeof XpEventSchema>

export const AttemptSchema = z.object({
  id: z.string(),
  pathId: z.string(),
  unitId: z.string(),
  exerciseId: z.string(),
  correct: z.boolean(),
  at: isoTime,
  context: ActivitySchema,
  updatedAt: isoTime,
})
export type Attempt = z.infer<typeof AttemptSchema>

export const UnitProgressSchema = z.object({
  unitId: z.string(),
  pathId: z.string(),
  /** Ensimmäinen suorituskerta; null = ei suoritettu. */
  completedAt: isoTime.nullable(),
  timesCompleted: z.int().min(0),
  /** Paras tulos: oikein 1. yrityksellä. */
  bestFirstTry: z.int().min(0),
  total: z.int().min(0),
  lastPracticedAt: isoTime.nullable(),
  /** Suoritettu tasotestin kautta. */
  viaPlacement: z.boolean(),
  updatedAt: isoTime,
})
export type UnitProgress = z.infer<typeof UnitProgressSchema>

export const ExamResultSchema = z.object({
  id: z.string(),
  pathId: z.string(),
  level: LevelSchema,
  kind: z.enum(['exam', 'placement']),
  score: z.int().min(0),
  total: z.int().min(1),
  passed: z.boolean(),
  at: isoTime,
  updatedAt: isoTime,
})
export type ExamResult = z.infer<typeof ExamResultSchema>

export const ReviewItemSchema = z.object({
  /** "<unitId>/<exerciseId>" */
  key: z.string(),
  pathId: z.string(),
  unitId: z.string(),
  exerciseId: z.string(),
  /** Leitner-laatikko 0–3 (välit 1, 3, 7, 14 päivää). */
  box: z.int().min(0).max(3),
  dueDate: dayKey,
  updatedAt: isoTime,
})
export type ReviewItem = z.infer<typeof ReviewItemSchema>

export const ErrorReportSchema = z.object({
  id: z.string(),
  pathId: z.string(),
  unitId: z.string(),
  exerciseId: z.string(),
  message: z.string(),
  createdAt: isoTime,
  updatedAt: isoTime,
})
export type ErrorReport = z.infer<typeof ErrorReportSchema>

export const SettingSchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  updatedAt: isoTime,
})
export type Setting = z.infer<typeof SettingSchema>

export const ExportDataSchema = z.object({
  xpEvents: z.array(XpEventSchema),
  attempts: z.array(AttemptSchema),
  unitProgress: z.array(UnitProgressSchema),
  examResults: z.array(ExamResultSchema),
  reviewItems: z.array(ReviewItemSchema),
  errorReports: z.array(ErrorReportSchema),
  settings: z.array(SettingSchema),
})
export type ExportData = z.infer<typeof ExportDataSchema>

export const ExportFileSchema = z.object({
  app: z.literal('it-oppi'),
  version: z.literal(1),
  exportedAt: isoTime,
  data: ExportDataSchema,
})
export type ExportFile = z.infer<typeof ExportFileSchema>
