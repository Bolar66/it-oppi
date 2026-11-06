import { describe, expect, it } from 'vitest'
import { validateContent } from './validate.ts'

const ex = (i: number) => ({
  id: `e${i}`,
  type: 'multiple_choice',
  prompt: 'K?',
  options: ['a', 'b'],
  answer: 0,
  explanation: 'x',
})
const unit = (id: string, level = 1) => ({
  id,
  title: 'T',
  level,
  theory: 'teoria',
  exercises: Array.from({ length: 8 }, (_, i) => ex(i + 1)),
})

function tree(): Record<string, unknown> {
  return {
    'paths.json': { paths: ['demo'] },
    'demo/path.json': {
      id: 'demo',
      title: 'Demo',
      description: 'd',
      levels: [{ level: 1, title: 'Perusteet', units: ['demo-1-01', 'demo-1-02'] }],
      placementTest: { questionCount: 20, passThreshold: 0.8 },
    },
    'demo/units/demo-1-01.json': unit('demo-1-01'),
    'demo/units/demo-1-02.json': unit('demo-1-02'),
    'demo/exams/level-1.json': { level: 1, questionCount: 20, passThreshold: 0.8 },
  }
}

describe('validateContent', () => {
  it('lataa kelvollisen puun', () => {
    const { content, errors } = validateContent(tree())
    expect(errors).toEqual([])
    expect(content.paths).toHaveLength(1)
    expect(Object.keys(content.paths[0]!.units)).toEqual(['demo-1-01', 'demo-1-02'])
    expect(content.paths[0]!.exams[1]?.questionCount).toBe(20)
  })

  it('ilmoittaa puuttuvasta yksikkötiedostosta', () => {
    const t = tree()
    delete t['demo/units/demo-1-02.json']
    expect(validateContent(t).errors).toContain('demo/units/demo-1-02.json: tiedosto puuttuu')
  })

  it('ilmoittaa tiedostosta, johon ei viitata', () => {
    const t = { ...tree(), 'demo/units/demo-1-03.json': unit('demo-1-03') }
    expect(validateContent(t).errors.join()).toMatch(/demo-1-03\.json: tiedostoa ei ole viitattu/)
  })

  it('ilmoittaa id:n ja tiedostonimen ristiriidasta', () => {
    const t = { ...tree(), 'demo/units/demo-1-02.json': unit('demo-1-05') }
    expect(validateContent(t).errors.join()).toMatch(/ei vastaa tiedostonimeä/)
  })

  it('ilmoittaa väärälle tasolle listatusta yksiköstä', () => {
    const t = tree()
    t['demo/units/demo-1-02.json'] = unit('demo-2-01', 2)
    ;(t['demo/path.json'] as { levels: { units: string[] }[] }).levels[0]!.units[1] = 'demo-2-01'
    t['demo/units/demo-2-01.json'] = t['demo/units/demo-1-02.json']
    delete t['demo/units/demo-1-02.json']
    expect(validateContent(t).errors.join()).toMatch(/listattu tasolle 1/)
  })

  it('ilmoittaa polun id:n ja kansion ristiriidasta', () => {
    const t = tree()
    ;(t['demo/path.json'] as { id: string }).id = 'other'
    expect(validateContent(t).errors.join()).toMatch(/ei vastaa kansion nimeä/)
  })

  it('palauttaa skeemavirheen tiedostopolun kanssa', () => {
    const t = tree()
    ;(t['demo/units/demo-1-01.json'] as { exercises: { answer: number }[] }).exercises[0]!.answer = 9
    expect(validateContent(t).errors.join()).toMatch(/demo-1-01\.json: exercises\.0\.answer/)
  })

  it('vaatii paths.json-tiedoston', () => {
    expect(validateContent({}).errors).toEqual(['paths.json: tiedosto puuttuu'])
  })
})
