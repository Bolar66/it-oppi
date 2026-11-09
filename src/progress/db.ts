import Dexie, { type Table } from 'dexie'
import type { Attempt, ErrorReport, ExamResult, ReviewItem, Setting, TermItem, UnitProgress, XpEvent } from './types.ts'

/** Synkronoinnin kirjanpito (ei synkronoida eikä viedä). */
export interface SyncMeta {
  key: 'userId' | 'lastPushAt' | 'lastPullAt' | 'lastSyncedAt'
  value: string | null
}

/** Poistomerkintä: poisto välitetään muille laitteille, jotta tietue ei palaa. */
export interface Tombstone {
  /** "<taulu>/<id>" */
  key: string
  table: SyncedTable
  id: string
  updatedAt: string
}

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
  declare syncMeta: Table<SyncMeta, string>
  declare tombstones: Table<Tombstone, string>

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
    // Vaihe 5: synkronoinnin kirjanpito.
    this.version(3).stores({
      syncMeta: 'key',
      tombstones: 'key',
    })
  }
}

export const db = new AppDB()

/** Käyttäjän data: viedään/tuodaan JSONina ja synkronoidaan. */
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

export type SyncedTable = (typeof TABLE_NAMES)[number]

/** Kunkin taulun pääavain (synkronoinnin id). */
export const PRIMARY_KEYS: Record<SyncedTable, string> = {
  xpEvents: 'id',
  attempts: 'id',
  unitProgress: 'unitId',
  examResults: 'id',
  reviewItems: 'key',
  errorReports: 'id',
  settings: 'key',
  termItems: 'key',
}
