import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDB } from '../progress/db.ts'
import type { ReviewItem, Setting, XpEvent } from '../progress/types.ts'
import { bindUser, getMeta, syncOnce } from './engine.ts'
import { MemoryRemote } from './remote.ts'

// Muutosajat tulevaisuudessa: syncOnce merkitsee lähetyksen ajaksi todellisen kellon, ja testin
// muutosten pitää olla sitä myöhempiä kuten oikeassa käytössä.
const T = (min: number) => new Date(Date.UTC(2030, 10, 1, 10, min)).toISOString()

const xp = (id: string, at: string, amount = 10): XpEvent => ({ id, at, date: at.slice(0, 10), amount, source: 'lesson', ref: 'u', updatedAt: at })
const goal = (value: number, at: string): Setting => ({ key: 'dailyGoal', value, updatedAt: at })
const review = (key: string, at: string): ReviewItem => ({ key, pathId: 'p', unitId: 'u', exerciseId: key, box: 0, dueDate: '2026-11-02', updatedAt: at })

let a: AppDB
let b: AppDB
let remote: MemoryRemote
let n = 0

beforeEach(async () => {
  n++
  a = new AppDB(`device-a-${n}`)
  b = new AppDB(`device-b-${n}`)
  remote = new MemoryRemote()
  await bindUser(a, 'user-1')
  await bindUser(b, 'user-1')
})

afterEach(async () => {
  await a.delete()
  await b.delete()
})

describe('syncOnce', () => {
  it('siirtää laitteen A datan laitteelle B', async () => {
    await a.xpEvents.bulkAdd([xp('x1', T(1)), xp('x2', T(2))])
    await a.settings.put(goal(30, T(3)))

    expect(await syncOnce(a, remote)).toMatchObject({ pushed: 3 })
    expect(await syncOnce(b, remote)).toMatchObject({ pushed: 0, pulled: 3 })

    expect(await b.xpEvents.count()).toBe(2)
    expect((await b.settings.get('dailyGoal'))?.value).toBe(30)
    expect(await getMeta(b, 'lastSyncedAt')).not.toBeNull()
  })

  it('yhdistää kummankin laitteen datan', async () => {
    await a.xpEvents.add(xp('a1', T(1)))
    await b.xpEvents.add(xp('b1', T(2)))
    await syncOnce(a, remote)
    await syncOnce(b, remote)
    await syncOnce(a, remote)
    expect((await a.xpEvents.toArray()).map((e) => e.id).sort()).toEqual(['a1', 'b1'])
    expect((await b.xpEvents.toArray()).map((e) => e.id).sort()).toEqual(['a1', 'b1'])
  })

  it('ristiriidassa uusin muutos voittaa, vaikka vanhempi synkronoidaan myöhemmin', async () => {
    await b.settings.put(goal(50, T(10)))
    await syncOnce(b, remote)
    // A muutti asetusta aiemmin offline-tilassa ja synkronoi vasta nyt.
    await a.settings.put(goal(20, T(5)))
    await syncOnce(a, remote)
    await syncOnce(b, remote)

    expect((await a.settings.get('dailyGoal'))?.value).toBe(50)
    expect((await b.settings.get('dailyGoal'))?.value).toBe(50)
  })

  it('uudempi paikallinen muutos ei korvaudu palvelimen vanhemmalla', async () => {
    await a.settings.put(goal(20, T(5)))
    await syncOnce(a, remote)
    await b.settings.put(goal(70, T(9)))
    await syncOnce(b, remote)
    expect((await b.settings.get('dailyGoal'))?.value).toBe(70)
    await syncOnce(a, remote)
    expect((await a.settings.get('dailyGoal'))?.value).toBe(70)
  })

  it('välittää poistot muille laitteille', async () => {
    await a.reviewItems.put(review('r1', T(1)))
    await syncOnce(a, remote)
    await syncOnce(b, remote)
    expect(await b.reviewItems.get('r1')).toBeDefined()

    await a.reviewItems.delete('r1')
    await a.tombstones.put({ key: 'reviewItems/r1', table: 'reviewItems', id: 'r1', updatedAt: T(5) })
    await syncOnce(a, remote)
    expect(await a.tombstones.count()).toBe(0)

    await syncOnce(b, remote)
    expect(await b.reviewItems.get('r1')).toBeUndefined()
  })

  it('poisto ei kumoa myöhemmin tehtyä muutosta', async () => {
    await a.reviewItems.put(review('r1', T(1)))
    await syncOnce(a, remote)
    await syncOnce(b, remote)
    // A poistaa klo 5, B päivittää klo 8.
    await a.reviewItems.delete('r1')
    await a.tombstones.put({ key: 'reviewItems/r1', table: 'reviewItems', id: 'r1', updatedAt: T(5) })
    await b.reviewItems.put({ ...review('r1', T(8)), box: 2 })
    await syncOnce(a, remote)
    await syncOnce(b, remote)
    await syncOnce(a, remote)
    expect((await a.reviewItems.get('r1'))?.box).toBe(2)
    expect((await b.reviewItems.get('r1'))?.box).toBe(2)
  })

  it('ei lähetä samoja tietueita uudelleen', async () => {
    await a.xpEvents.add(xp('x1', T(1)))
    await syncOnce(a, remote, () => new Date(T(2)))
    expect(await syncOnce(a, remote, () => new Date(T(3)))).toMatchObject({ pushed: 0, pulled: 0 })
  })

  it('hakee yli sivun kokoisen määrän tietueita', async () => {
    await a.xpEvents.bulkAdd(Array.from({ length: 1203 }, (_, i) => xp(`x${i}`, T(1))))
    await syncOnce(a, remote)
    await syncOnce(b, remote)
    expect(await b.xpEvents.count()).toBe(1203)
  })

  it('hylkää virheellisen palvelimen datan', async () => {
    await remote.push([
      { table_name: 'xpEvents', id: 'bad', data: { id: 'bad' }, deleted: false, updated_at: T(1) },
      { table_name: 'unknown', id: 'z', data: {}, deleted: false, updated_at: T(1) },
    ])
    expect(await syncOnce(b, remote)).toMatchObject({ pulled: 0 })
    expect(await b.xpEvents.count()).toBe(0)
  })
})

describe('bindUser', () => {
  it('ensimmäisellä kirjautumisella laitteen data lähetetään tilille', async () => {
    const c = new AppDB(`device-c-${n}`)
    await c.xpEvents.add(xp('old', T(1)))
    await bindUser(c, 'user-1')
    expect(await syncOnce(c, remote)).toMatchObject({ pushed: 1 })
    await c.delete()
  })

  it('toisen käyttäjän data poistetaan laitteelta', async () => {
    await a.xpEvents.add(xp('x1', T(1)))
    await syncOnce(a, remote)
    await bindUser(a, 'user-2')
    expect(await a.xpEvents.count()).toBe(0)
    expect(await getMeta(a, 'userId')).toBe('user-2')
    expect(await getMeta(a, 'lastPullAt')).toBeNull()
  })
})
