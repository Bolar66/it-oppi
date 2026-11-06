// @vitest-environment node
// Lukee content/-kansion levyltä, joten ajetaan Node-ympäristössä.
import { describe, expect, it } from 'vitest'
import { runValidation } from '../../scripts/validate-content.ts'
import { content, getPath, getUnit } from './loader.ts'

describe('content/-kansion sisältö', () => {
  it('läpäisee validoinnin (sama kuin pnpm validate-content)', () => {
    const { errors } = runValidation()
    expect(errors).toEqual([])
  })

  it('loader lataa saman sisällön kuin levyltä luettu', () => {
    const fromDisk = runValidation().content
    expect(content).toEqual(fromDisk)
  })

  it('getPath ja getUnit löytävät esimerkkiyksikön', () => {
    expect(getPath('python')?.title).toBe('Python')
    expect(getUnit('python', 'python-1-01')?.exercises.length).toBeGreaterThanOrEqual(8)
    expect(getUnit('python', 'ei-ole')).toBeUndefined()
    expect(getPath('ei-ole')).toBeUndefined()
  })

  it('esimerkkiyksikössä on kaikki kuusi harjoitustyyppiä', () => {
    const types = new Set(getUnit('python', 'python-1-01')?.exercises.map((e) => e.type))
    expect([...types].sort()).toEqual(
      ['code_output', 'fill_blank', 'find_bug', 'match_pairs', 'multiple_choice', 'order_lines'].sort(),
    )
  })
})
