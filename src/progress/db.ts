import Dexie, { type Table } from 'dexie'
import type { Attempt, ErrorReport, ExamResult, ReviewItem, Setting, UnitProgress, XpEvent } from './types.ts'

export class AppDB extends Dexie {
  // `declare`: luokan kentät eivät saa ylikirjoittaa Dexien luomia tauluja (ES2022 class fields).
  declare xpEvents: Table<XpEvent, string>
  declare attempts: Table<Attempt, string>
  declare unitProgress: Table<UnitProgress, string>
  declare examResults: Table<ExamResult, string>
  declare reviewItems: Table<ReviewItem, string>
  declare errorReports: Table<ErrorReport, string>
  declare settings: Table<Setting, string>

  constructor(name = 'it-oppi') {
    super(name)
    this.version(1).stores({
      xpEvents: 'id, date',
      attempts: 'id, unitId, at',
      unitProgress: 'unitId, pathId',
      examResults: 'id, pathId',
      reviewItems: 'key, dueDate',
      errorReports: 'id, createdAt',
      settings: 'key',
    })
  }
}

export const db = new AppDB()

export const TABLE_NAMES = [
  'xpEvents',
  'attempts',
  'unitProgress',
  'examResults',
  'reviewItems',
  'errorReports',
  'settings',
] as const
