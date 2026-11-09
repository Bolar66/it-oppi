import type { SupabaseClient } from '@supabase/supabase-js'

/** Tietue lähetettäväksi palvelimelle. */
export interface PushRow {
  table_name: string
  id: string
  data: unknown
  deleted: boolean
  /** Muutoksen aika laitteella (ISO). */
  updated_at: string
}

/** Palvelimelta haettu tietue. */
export interface RemoteRow extends PushRow {
  /** Palvelimen tallennusaika (ISO); haku etenee tämän mukaan. */
  server_updated_at: string
}

/** Palvelin synkronoinnille. Toteutukset: Supabase (tuotanto) ja muisti (testit). */
export interface Remote {
  /** Tallentaa rivit; vanhempi muutos ei korvaa uudempaa (updated_at). */
  push(rows: PushRow[]): Promise<void>
  /** Rivit, joiden server_updated_at >= since, vanhimmasta alkaen, enintään limit kpl. */
  pull(since: string | null, limit: number): Promise<RemoteRow[]>
}

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async push(rows) {
      const { error } = await client.rpc('push_records', { rows })
      if (error) throw new Error(`Tallennus palvelimelle epäonnistui: ${error.message}`)
    },
    async pull(since, limit) {
      let query = client
        .from('records')
        .select('table_name, id, data, deleted, updated_at, server_updated_at')
        .order('server_updated_at', { ascending: true })
        .limit(limit)
      if (since) query = query.gte('server_updated_at', since)
      const { data, error } = await query
      if (error) throw new Error(`Haku palvelimelta epäonnistui: ${error.message}`)
      return (data ?? []) as RemoteRow[]
    },
  }
}

/** Muistissa toimiva palvelin testeihin: samat säännöt kuin supabase/schema.sql. */
export class MemoryRemote implements Remote {
  rows = new Map<string, RemoteRow>()
  private clock = 0

  async push(rows: PushRow[]): Promise<void> {
    for (const r of rows) {
      const key = `${r.table_name}/${r.id}`
      const existing = this.rows.get(key)
      if (existing && Date.parse(r.updated_at) < Date.parse(existing.updated_at)) continue
      this.clock++
      this.rows.set(key, { ...r, server_updated_at: new Date(Date.UTC(2026, 0, 1) + this.clock).toISOString() })
    }
  }

  async pull(since: string | null, limit: number): Promise<RemoteRow[]> {
    return [...this.rows.values()]
      .filter((r) => !since || r.server_updated_at >= since)
      .sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at))
      .slice(0, limit)
  }
}
