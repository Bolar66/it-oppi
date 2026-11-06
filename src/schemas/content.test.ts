import { describe, expect, it } from 'vitest'
import { ExerciseSchema, PathSchema, UnitSchema } from './content.ts'

const valid = {
  multiple_choice: { id: 'e1', type: 'multiple_choice', prompt: 'K?', options: ['a', 'b'], answer: 1, explanation: 'x' },
  code_output: { id: 'e2', type: 'code_output', language: 'python', code: 'print(1)', answer: '1', verified: true, explanation: 'x' },
  fill_blank: { id: 'e3', type: 'fill_blank', language: 'python', code: 'a.___(1)', answers: ['append'], explanation: 'x' },
  order_lines: { id: 'e4', type: 'order_lines', language: 'python', lines: ['a = 1', 'print(a)'], explanation: 'x' },
  match_pairs: { id: 'e5', type: 'match_pairs', pairs: [['list', 'muuttuva'], ['tuple', 'muuttumaton']], explanation: 'x' },
  find_bug: { id: 'e6', type: 'find_bug', language: 'python', code: 'a = 1\nprint(b)', bugLine: 2, explanation: 'x' },
} as const

describe('ExerciseSchema', () => {
  it.each(Object.entries(valid))('hyväksyy kelvollisen %s', (_, ex) => {
    expect(ExerciseSchema.safeParse(ex).success).toBe(true)
  })

  it('vaatii explanation-kentän', () => {
    const { explanation: _omit, ...rest } = valid.code_output
    expect(ExerciseSchema.safeParse(rest).success).toBe(false)
  })

  it('hylkää tuntemattoman tyypin', () => {
    expect(ExerciseSchema.safeParse({ ...valid.code_output, type: 'essay' }).success).toBe(false)
  })

  it('hylkää monivalinnan answer-indeksin vaihtoehtojen ulkopuolelta', () => {
    expect(ExerciseSchema.safeParse({ ...valid.multiple_choice, answer: 2 }).success).toBe(false)
  })

  it('vaatii monivalintaan prompt-kentän', () => {
    const { prompt: _omit, ...rest } = valid.multiple_choice
    expect(ExerciseSchema.safeParse(rest).success).toBe(false)
  })

  it('vaatii aukkojen määrän vastaavan answers-listaa', () => {
    expect(ExerciseSchema.safeParse({ ...valid.fill_blank, answers: ['a', 'b'] }).success).toBe(false)
    expect(ExerciseSchema.safeParse({ ...valid.fill_blank, code: 'a.append(1)' }).success).toBe(false)
  })

  it('hylkää bugLine-arvon koodin ulkopuolelta', () => {
    expect(ExerciseSchema.safeParse({ ...valid.find_bug, bugLine: 3 }).success).toBe(false)
    expect(ExerciseSchema.safeParse({ ...valid.find_bug, bugLine: 0 }).success).toBe(false)
  })

  it('hylkää samanlaiset rivit order_lines-harjoituksessa', () => {
    expect(ExerciseSchema.safeParse({ ...valid.order_lines, lines: ['x', 'x'] }).success).toBe(false)
  })

  it('hylkää match_pairs-kaksoiskappaleet', () => {
    expect(ExerciseSchema.safeParse({ ...valid.match_pairs, pairs: [['a', '1'], ['b', '1']] }).success).toBe(false)
  })

  it('hylkää tuntemattoman kielen', () => {
    expect(ExerciseSchema.safeParse({ ...valid.code_output, language: 'cobol' }).success).toBe(false)
  })
})

const exercises = Array.from({ length: 8 }, (_, i) => ({ ...valid.code_output, id: `e${i + 1}` }))
const unit = { id: 'python-1-01', title: 'T', level: 1, theory: 'teoria', exercises }

describe('UnitSchema', () => {
  it('hyväksyy kelvollisen yksikön', () => {
    expect(UnitSchema.safeParse(unit).success).toBe(true)
  })

  it('vaatii 8–12 harjoitusta', () => {
    expect(UnitSchema.safeParse({ ...unit, exercises: exercises.slice(0, 7) }).success).toBe(false)
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ ...valid.code_output, id: `e${i + 1}` }))
    expect(UnitSchema.safeParse({ ...unit, exercises: thirteen }).success).toBe(false)
  })

  it('vaatii uniikit harjoitus-id:t', () => {
    const dup = [...exercises.slice(0, 7), { ...valid.code_output, id: 'e1' }]
    expect(UnitSchema.safeParse({ ...unit, exercises: dup }).success).toBe(false)
  })

  it('tarkistaa id:n muodon ja tason', () => {
    expect(UnitSchema.safeParse({ ...unit, id: 'python-01' }).success).toBe(false)
    expect(UnitSchema.safeParse({ ...unit, level: 2 }).success).toBe(false)
  })
})

describe('PathSchema', () => {
  const path = {
    id: 'python',
    title: 'Python',
    description: 'd',
    levels: [{ level: 1, title: 'Perusteet', units: ['python-1-01'] }],
    placementTest: { questionCount: 20, passThreshold: 0.8 },
  }

  it('hyväksyy kelvollisen polun', () => {
    expect(PathSchema.safeParse(path).success).toBe(true)
  })

  it('hylkää saman tason kahdesti', () => {
    expect(PathSchema.safeParse({ ...path, levels: [path.levels[0], path.levels[0]] }).success).toBe(false)
  })

  it('hylkää läpäisyrajan yli 1', () => {
    expect(PathSchema.safeParse({ ...path, placementTest: { questionCount: 20, passThreshold: 80 } }).success).toBe(
      false,
    )
  })
})
