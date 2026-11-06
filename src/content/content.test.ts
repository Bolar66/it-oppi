// @vitest-environment node
// Lukee content/-kansion levyltä, joten ajetaan Node-ympäristössä.
import { describe, expect, it } from 'vitest'
import { runValidation } from '../../scripts/validate-content.ts'
import { toIndex } from './contentIndex.ts'
import { checkQuality } from './quality.ts'
import { content, getLoadedUnit, getPath, getUnitMeta, loadUnit } from './loader.ts'

describe('content/-kansion sisältö', () => {
  it('läpäisee validoinnin (sama kuin pnpm validate-content)', () => {
    const { errors } = runValidation()
    expect(errors).toEqual([])
  })

  it('läpäisee laatusäännöt (vähintään 3 harjoitustyyppiä per yksikkö)', () => {
    expect(checkQuality(runValidation().content).errors).toEqual([])
  })

  it('sisältöindeksi vastaa levyltä luettua sisältöä', () => {
    expect(content).toEqual(toIndex(runValidation().content))
  })

  it('indeksissä ei ole yksiköiden teoriaa eikä harjoituksia', () => {
    const meta = getUnitMeta('python', 'python-1-01')!
    expect(Object.keys(meta).sort()).toEqual(['exerciseCount', 'id', 'level', 'title'])
  })

  it('python-polulla on termejä', () => {
    expect(getPath('python')?.terms.length).toBeGreaterThan(0)
  })

  it('loadUnit lataa yksikön, sama kuin levyllä, ja tallentaa välimuistiin', async () => {
    const unit = await loadUnit('python', 'python-1-01')
    expect(unit).toEqual(runValidation().content.paths.find((p) => p.id === 'python')!.units['python-1-01'])
    expect(getLoadedUnit('python', 'python-1-01')).toBe(unit)
    expect(unit.exercises.length).toBe(getUnitMeta('python', 'python-1-01')!.exerciseCount)
  })

  it('loadUnit hylkää tuntemattoman yksikön', async () => {
    await expect(loadUnit('python', 'ei-ole')).rejects.toThrow(/ei ole/)
    await expect(loadUnit('ei-ole', 'python-1-01')).rejects.toThrow(/ei ole/)
    expect(getPath('ei-ole')).toBeUndefined()
  })

  it('esimerkkiyksikössä on kaikki kuusi harjoitustyyppiä', async () => {
    const types = new Set((await loadUnit('python', 'python-1-01')).exercises.map((e) => e.type))
    expect([...types].sort()).toEqual(
      ['code_output', 'fill_blank', 'find_bug', 'match_pairs', 'multiple_choice', 'order_lines'].sort(),
    )
  })
})
