import { describe, expect, it } from 'vitest'
import type { Exercise, Unit } from '../schemas/content.ts'
import { checkQuality, countWords } from './quality.ts'
import type { ContentTree, LoadedPath } from './validate.ts'

const mc = (id: string): Exercise => ({ id, type: 'multiple_choice', prompt: 'K', options: ['a', 'b'], answer: 0, explanation: 'x' })
const co = (id: string): Exercise => ({ id, type: 'code_output', language: 'python', code: 'print(1)', answer: '1', verified: true, explanation: 'x' })
const bug = (id: string): Exercise => ({ id, type: 'find_bug', language: 'python', code: 'a\nb', bugLine: 1, explanation: 'x' })

const unit = (exercises: Exercise[], theory = 'Lyhyt teoria.'): Unit => ({ id: 'd-1-01', title: 'T', level: 1, theory, exercises })
const tree = (u: Unit, over: Partial<LoadedPath> = {}): ContentTree => ({
  paths: [
    {
      id: 'd',
      title: 'D',
      description: 'd',
      levels: [{ level: 1, title: 'P', units: [u.id] }],
      placementTest: { questionCount: 20, passThreshold: 0.8 },
      units: { [u.id]: u },
      exams: { 1: { level: 1, questionCount: 20, passThreshold: 0.8 } },
      terms: [{ id: 't', term: 't', definition: 'd', level: 1, unit: u.id }],
      ...over,
    },
  ],
})

describe('checkQuality', () => {
  it('kolme tyyppiä riittää, ei varoituksia', () => {
    expect(checkQuality(tree(unit([mc('e1'), co('e2'), bug('e3')])))).toEqual({ errors: [], warnings: [] })
  })

  it('alle kolme harjoitustyyppiä on virhe', () => {
    expect(checkQuality(tree(unit([mc('e1'), mc('e2'), co('e3')]))).errors.join()).toMatch(/vain 2 harjoitustyyppiä/)
  })

  it('varoittaa pitkästä teoriasta, puuttuvista termeistä ja kokeesta', () => {
    const long = Array.from({ length: 400 }, () => 'sana').join(' ')
    const r = checkQuality(tree(unit([mc('e1'), co('e2'), bug('e3')], long), { terms: [], exams: {} }))
    expect(r.errors).toEqual([])
    expect(r.warnings.join('\n')).toMatch(/400 sanaa/)
    expect(r.warnings.join('\n')).toMatch(/ei ole termejä/)
    expect(r.warnings.join('\n')).toMatch(/exams\/level-1\.json/)
  })

  it('countWords ohittaa koodilohkot ja pelkät merkit', () => {
    expect(countWords('Yksi kaksi\n\n```python\nprint(1)\nx = 2\n```\n\n- kolme `=`')).toBe(3)
  })
})
