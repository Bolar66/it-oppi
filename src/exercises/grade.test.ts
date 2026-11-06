import { describe, expect, it } from 'vitest'
import type { Exercise } from '../schemas/content.ts'
import { blankSegments, emptyAnswer, grade, isComplete, normalizeOutput, type Answer } from './grade.ts'
import { shuffle, shuffledIndices } from './shuffle.ts'

const mc: Exercise = { id: 'm', type: 'multiple_choice', prompt: 'K', options: ['a', 'b', 'c'], answer: 2, explanation: 'x' }
const co: Exercise = { id: 'c', type: 'code_output', language: 'python', code: 'x', answer: 'a\nb', verified: true, explanation: 'x' }
const fb: Exercise = { id: 'f', type: 'fill_blank', language: 'python', code: 'a.___(1)\n___', answers: ['append', 'b'], explanation: 'x' }
const ol: Exercise = { id: 'o', type: 'order_lines', language: 'python', lines: ['a', 'b', 'c'], explanation: 'x' }
const mp: Exercise = { id: 'p', type: 'match_pairs', pairs: [['a', '1'], ['b', '2']], explanation: 'x' }
const bug: Exercise = { id: 'b', type: 'find_bug', language: 'python', code: 'a\nb\nc', bugLine: 2, explanation: 'x' }

describe('normalizeOutput', () => {
  it('ohittaa rivien lopun välilyönnit, CRLF:n ja lopun tyhjät rivit', () => {
    expect(normalizeOutput('a  \r\nb\n\n')).toBe('a\nb')
  })
  it('säilyttää rivin alun välilyönnit', () => {
    expect(normalizeOutput('  a')).toBe('  a')
  })
})

describe('emptyAnswer ja isComplete', () => {
  it.each([mc, co, fb, ol, mp, bug])('tyhjä vastaus ei ole valmis ($type)', (ex) => {
    expect(isComplete(ex, emptyAnswer(ex))).toBe(false)
  })
  it('vääräntyyppinen vastaus ei ole valmis', () => {
    expect(isComplete(mc, { type: 'find_bug', line: 1 })).toBe(false)
  })
  it('fill_blank vaatii kaikki aukot', () => {
    expect(isComplete(fb, { type: 'fill_blank', values: ['append', ' '] })).toBe(false)
  })
})

describe('grade', () => {
  const cases: [string, Exercise, Answer, boolean][] = [
    ['mc oikein', mc, { type: 'multiple_choice', choice: 2 }, true],
    ['mc väärin', mc, { type: 'multiple_choice', choice: 0 }, false],
    ['tuloste oikein (lopun välilyönnit ok)', co, { type: 'code_output', text: 'a \nb\n' }, true],
    ['tuloste: kirjainkoko ratkaisee', co, { type: 'code_output', text: 'A\nb' }, false],
    ['tuloste väärin', co, { type: 'code_output', text: 'a b' }, false],
    ['aukot oikein (trimmataan)', fb, { type: 'fill_blank', values: [' append ', 'b'] }, true],
    ['aukot väärin', fb, { type: 'fill_blank', values: ['Append', 'b'] }, false],
    ['järjestys oikein', ol, { type: 'order_lines', order: [0, 1, 2] }, true],
    ['järjestys väärin', ol, { type: 'order_lines', order: [1, 0, 2] }, false],
    ['järjestys kesken', ol, { type: 'order_lines', order: [0, 1] }, false],
    ['parit oikein', mp, { type: 'match_pairs', matches: [0, 1] }, true],
    ['parit väärin', mp, { type: 'match_pairs', matches: [1, 0] }, false],
    ['bugirivi oikein', bug, { type: 'find_bug', line: 2 }, true],
    ['bugirivi väärin', bug, { type: 'find_bug', line: 3 }, false],
  ]
  it.each(cases)('%s', (_, ex, answer, expected) => {
    expect(grade(ex, answer)).toBe(expected)
  })
})

describe('fill_blank ja kirjainkoko', () => {
  const textBlank: Exercise = { id: 't', type: 'fill_blank', language: 'text', code: '1 tavu = 8 ___', answers: ['bittiä'], explanation: 'x' }
  it('tekstissä kirjainkoolla ei ole väliä', () => {
    expect(grade(textBlank, { type: 'fill_blank', values: ['Bittiä'] })).toBe(true)
    expect(grade(textBlank, { type: 'fill_blank', values: [' BITTIÄ '] })).toBe(true)
    expect(grade(textBlank, { type: 'fill_blank', values: ['tavua'] })).toBe(false)
  })
})

describe('blankSegments', () => {
  it('numeroi aukot juoksevasti rivien yli', () => {
    expect(blankSegments('a.___(1)\n___ x ___')).toEqual([['a.', 0, '(1)'], [1, ' x ', 2]])
  })
})

describe('shuffle', () => {
  it('säilyttää alkiot', () => {
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
  })
  it('shuffledIndices ei palauta valmiiksi oikeaa järjestystä', () => {
    for (let i = 0; i < 200; i++) {
      const s = shuffledIndices(2)
      expect(s).toEqual([1, 0])
    }
    // Satunnaislähde, joka palauttaisi aina identiteetin → käytetään kiertoa.
    expect(shuffledIndices(3, () => 0.999)).not.toEqual([0, 1, 2])
  })
  it('lyhyet listat palautetaan sellaisenaan', () => {
    expect(shuffledIndices(1)).toEqual([0])
    expect(shuffledIndices(0)).toEqual([])
  })
})
