import Dexie, { type Table } from 'dexie'
import type { Attempt, ErrorReport, ExamResult, ReviewItem, Setting, TermItem, UnitProgress, XpEvent } from './types.ts'

export class AppDB extends Dexie {
  // `declare`: luokan kentät eivät saa ylikirjoittaa Dexien luomia tauluja (ES2022 class fields).
  declare xpEvents: Table<XpEvent, string>
  declare attempts: Table<Attempt, string>
  declare unitProgress: Table<UnitProgress, string>
  declare examResults: Table<ExamResult, string>
  declare reviewItems: Table<ReviewItem, string>
  declare errorReports: Table<ErrorReport, string>
  declare settings: Table<Setting, string>
  declare termItems: Table<TermItem, string>

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
    // Vaihe 3b: termien Leitner-kertaus. Vanhat taulut säilyvät ennallaan.
    this.version(2).stores({
      termItems: 'key, pathId, dueDate',
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
  'termItems',
] as const
