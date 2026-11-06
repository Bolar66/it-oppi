import { beforeEach, describe, expect, it } from 'vitest'
import { addReport, loadReports, removeReport, STORAGE_KEY } from './errorReports.ts'

describe('errorReports', () => {
  beforeEach(() => localStorage.clear())

  it('tallentaa, lataa ja poistaa ilmoituksen', () => {
    const r = addReport({ pathId: 'python', unitId: 'python-1-01', exerciseId: 'e1', message: 'virhe' })
    expect(loadReports()).toEqual([r])
    expect(removeReport(r.id)).toEqual([])
    expect(loadReports()).toEqual([])
  })

  it('palauttaa tyhjän listan, jos tallennettu data on rikki', () => {
    localStorage.setItem(STORAGE_KEY, '{ei jsonia')
    expect(loadReports()).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 1 }]))
    expect(loadReports()).toEqual([])
  })
})
