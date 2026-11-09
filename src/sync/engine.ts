import type { z } from 'zod'
import { PRIMARY_KEYS, TABLE_NAMES, type AppDB, type SyncMeta, type SyncedTable } from '../progress/db.ts'
import {
  AttemptSchema,
  ErrorReportSchema,
  ExamResultSchema,
  ReviewItemSchema,
  SettingSchema,
  TermItemSchema,
  UnitProgressSchema,
  XpEventSchema,
} from '../progress/types.ts'
import type { PushRow, Remote, RemoteRow } from './remote.ts'

/** Palvelimelta tuleva data validoidaan samoilla skeemoilla kuin JSON-tuonti. */
const SCHEMAS: Record<SyncedTable, z.ZodType<{ updatedAt: string }>> = {
  xpEvents: XpEventSchema,
  attempts: AttemptSchema,
  unitProgress: UnitProgressSchema,
  examResults: ExamResultSchema,
  reviewItems: ReviewItemSchema,
  errorReports: ErrorReportSchema,
  settings: SettingSchema,
  termItems: TermItemSchema,
}

const BATCH = 500

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY)
const isSynced = (t: string): t is SyncedTable => (TABLE_NAMES as readonly string[]).includes(t)

export async function getMeta(db: AppDB, key: SyncMeta['key']): Promise<string | null> {
  return (await db.syncMeta.get(key))?.value ?? null
}

export async function setMeta(db: AppDB, key: SyncMeta['key'], value: string | null): Promise<void> {
  await db.syncMeta.put({ key, value })
}

/**
 * Varmistaa, että laitteen kirjanpito kuuluu kirjautuneelle käyttäjälle. Ensimmäisellä kirjautumisella
 * laitteen olemassa oleva data lähetetään kokonaan tilille (yhdistäminen). Jos laitteella on toisen
 * käyttäjän data (ei pitäisi tapahtua, koska uloskirjautuminen tyhjentää laitteen), se poistetaan.
 */
export async function bindUser(db: AppDB, userId: string): Promise<void> {
  const current = await getMeta(db, 'userId')
  if (current === userId) return
  if (current) {
    await Promise.all([...TABLE_NAMES.map((t) => db.table(t).clear()), db.tombstones.clear()])
  }
  await db.syncMeta.bulkPut([
    { key: 'userId', value: userId },
    { key: 'lastPushAt', value: null },
    { key: 'lastPullAt', value: null },
  ])
}

export interface SyncResult {
  pushed: number
  pulled: number
}

/**
 * Yksi synkronointikierros: ensin laitteen muutokset palvelimelle, sitten palvelimen muutokset laitteelle.
 * Ristiriidassa uusin muutos (updatedAt) voittaa sekä palvelimella että laitteella.
 */
export async function syncOnce(db: AppDB, remote: Remote, now: () => Date = () => new Date()): Promise<SyncResult> {
  // 1. Lähetys: tietueet, joita on muutettu edellisen lähetyksen jälkeen, ja poistomerkinnät.
  const lastPushAt = await getMeta(db, 'lastPushAt')
  const pushStartedAt = now().toISOString()
  const rows: PushRow[] = []
  for (const table of TABLE_NAMES) {
    const pk = PRIMARY_KEYS[table]
    const changed = await db
      .table(table)
      // >=: saman millisekunnin muutos ei jää lähettämättä (uudelleenlähetys on harmiton).
      .filter((r: { updatedAt: string }) => time(r.updatedAt) >= time(lastPushAt))
      .toArray()
    for (const r of changed) {
      rows.push({ table_name: table, id: String(r[pk]), data: r, deleted: false, updated_at: r.updatedAt })
    }
  }
  const tombstones = await db.tombstones.toArray()
  for (const t of tombstones) {
    // Jos tietue on luotu uudelleen poiston jälkeen, se lähetetään tavallisena tietueena.
    if (await db.table(t.table).get(t.id)) continue
    rows.push({ table_name: t.table, id: t.id, data: null, deleted: true, updated_at: t.updatedAt })
  }
  for (let i = 0; i < rows.length; i += BATCH) await remote.push(rows.slice(i, i + BATCH))
  await db.tombstones.bulkDelete(tombstones.map((t) => t.key))
  await setMeta(db, 'lastPushAt', pushStartedAt)

  // 2. Haku: palvelimen muutokset edellisen haun jälkeen (palvelimen kellolla).
  let since = await getMeta(db, 'lastPullAt')
  let pulled = 0
  for (;;) {
    const page = await remote.pull(since, BATCH)
    for (const row of page) if (await applyRemote(db, row)) pulled++
    if (page.length === 0) break
    const last = page[page.length - 1]!.server_updated_at
    // Täysi sivu, jonka kaikki rivit ovat samalta hetkeltä: ei edistytä → lopetetaan (rivit on jo käsitelty).
    if (page.length < BATCH || last === since) {
      since = last
      break
    }
    since = last
  }
  await db.syncMeta.bulkPut([
    { key: 'lastPullAt', value: since },
    { key: 'lastSyncedAt', value: now().toISOString() },
  ])
  return { pushed: rows.length, pulled }
}

/** Soveltaa yhden palvelimen rivin laitteelle, jos se on uudempi. Palauttaa true, jos jotain muuttui. */
async function applyRemote(db: AppDB, row: RemoteRow): Promise<boolean> {
  if (!isSynced(row.table_name)) return false
  const table = db.table(row.table_name)
  const local = (await table.get(row.id)) as { updatedAt: string } | undefined

  if (row.deleted) {
    if (!local || time(local.updatedAt) > time(row.updated_at)) return false
    await table.delete(row.id)
    return true
  }
  const parsed = SCHEMAS[row.table_name].safeParse(row.data)
  if (!parsed.success) return false
  if (local && time(local.updatedAt) >= time(parsed.data.updatedAt)) return false
  await table.put(parsed.data)
  return true
}
