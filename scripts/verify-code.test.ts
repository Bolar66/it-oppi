// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { judge, runtimeFor, type CodeItem } from './verify-code.ts'

const item = (over: Partial<CodeItem> = {}): CodeItem => ({
  file: 'p/units/p-1-01.json',
  exerciseId: 'e1',
  type: 'code_output',
  language: 'python',
  code: 'print(1)',
  answer: '1',
  verified: true,
  ...over,
})
const ok = (stdout: string) => ({ ok: true, stdout, stderr: '' })

describe('runtimeFor', () => {
  it('ohjaa pandas/numpy-koodin venviin ja muun Pythonin python3:lle', () => {
    expect(runtimeFor('python', 'import pandas as pd\nprint(1)')).toBe('python-data')
    expect(runtimeFor('python', 'from numpy import array')).toBe('python-data')
    expect(runtimeFor('python', 'print("import pandas")')).toBe('python')
  })
  it('ei-ajettavat kielet', () => {
    expect(runtimeFor('postgresql', 'SELECT 1')).toBeNull()
    expect(runtimeFor('html', '<p>')).toBeNull()
    expect(runtimeFor('sql', 'SELECT 1')).toBe('sql')
  })
})

describe('judge', () => {
  it('täsmäävä tuloste (rivinvaihdot ja lopun välilyönnit normalisoidaan)', () => {
    expect(judge(item({ answer: 'a\nb' }), 'python', true, ok('a  \r\nb\r\n\n')).level).toBe('ok')
  })
  it('väärä tuloste on virhe', () => {
    expect(judge(item(), 'python', true, ok('2\n'))).toMatchObject({ level: 'error', message: expect.stringMatching(/odotettu/) })
  })
  it('kaatuva koodi on virhe', () => {
    expect(judge(item(), 'python', true, { ok: false, stdout: '', stderr: 'Traceback\nZeroDivisionError' })).toMatchObject({
      level: 'error',
      message: expect.stringMatching(/ZeroDivisionError/),
    })
  })
  it('ajettavissa mutta verified: false on virhe', () => {
    expect(judge(item({ verified: false }), 'python', true, ok('1')).message).toMatch(/verified: true/)
  })
  it('ei ajettavissa: verified: false ok, verified: true virhe', () => {
    expect(judge(item({ language: 'kotlin', verified: false }), 'kotlin', false).level).toBe('ok')
    expect(judge(item({ language: 'postgresql', verified: true }), null, false).level).toBe('error')
  })
  it('find_bug: kaatumaton koodi on tieto, ei virhe', () => {
    const fb = item({ type: 'find_bug', answer: undefined, verified: undefined })
    expect(judge(fb, 'python', true, ok('')).level).toBe('info')
    expect(judge(fb, 'python', true, { ok: false, stdout: '', stderr: 'NameError' }).level).toBe('ok')
  })
})
