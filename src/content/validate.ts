import type { z } from 'zod'
import {
  ExamSchema,
  PathSchema,
  PathsIndexSchema,
  TermsFileSchema,
  UnitSchema,
  type Exam,
  type Level,
  type Path,
  type Term,
  type Unit,
} from '../schemas/content.ts'

export interface LoadedPath extends Path {
  /** Yksiköt id:n mukaan. */
  units: Record<string, Unit>
  /** Tasojen kokeet tasonumeron mukaan (puuttuva = koetta ei vielä ole). */
  exams: Partial<Record<Level, Exam>>
  /** Polun termit (tyhjä, jos terms.json puuttuu). */
  terms: Term[]
}

export interface ContentTree {
  paths: LoadedPath[]
}

export interface ValidationResult {
  content: ContentTree
  errors: string[]
}

function formatZodError(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`)
}

/**
 * Validoi koko content/-puun.
 * @param files avain = polku content/-kansion suhteen (esim. "python/units/python-1-01.json"), arvo = jäsennetty JSON
 */
export function validateContent(files: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const paths: LoadedPath[] = []
  const used = new Set<string>()

  const parse = <T>(file: string, schema: z.ZodType<T>): T | undefined => {
    used.add(file)
    if (!(file in files)) {
      errors.push(`${file}: tiedosto puuttuu`)
      return undefined
    }
    const r = schema.safeParse(files[file])
    if (!r.success) {
      errors.push(...formatZodError(file, r.error))
      return undefined
    }
    return r.data
  }

  const index = parse('paths.json', PathsIndexSchema)
  if (!index) return { content: { paths }, errors }

  if (new Set(index.paths).size !== index.paths.length) {
    errors.push('paths.json: polkulistassa on kaksoiskappaleita')
  }

  for (const pathId of index.paths) {
    const pathFile = `${pathId}/path.json`
    const path = parse(pathFile, PathSchema)
    if (!path) continue
    if (path.id !== pathId) errors.push(`${pathFile}: id "${path.id}" ei vastaa kansion nimeä "${pathId}"`)

    const units: Record<string, Unit> = {}
    const exams: LoadedPath['exams'] = {}

    for (const lvl of path.levels) {
      for (const unitId of lvl.units) {
        const unitFile = `${pathId}/units/${unitId}.json`
        if (units[unitId]) {
          errors.push(`${pathFile}: yksikkö ${unitId} on listattu useaan kertaan`)
          continue
        }
        const unit = parse(unitFile, UnitSchema)
        if (!unit) continue
        if (unit.id !== unitId) errors.push(`${unitFile}: id "${unit.id}" ei vastaa tiedostonimeä`)
        if (!unit.id.startsWith(`${pathId}-`)) errors.push(`${unitFile}: id ei ala polun nimellä "${pathId}-"`)
        if (unit.level !== lvl.level) {
          errors.push(`${unitFile}: level ${unit.level}, mutta se on listattu tasolle ${lvl.level}`)
        }
        units[unitId] = unit
      }

      const examFile = `${pathId}/exams/level-${lvl.level}.json`
      if (examFile in files) {
        const exam = parse(examFile, ExamSchema)
        if (exam) {
          if (exam.level !== lvl.level) errors.push(`${examFile}: level ei vastaa tiedostonimeä`)
          exams[lvl.level] = exam
        }
      }
    }

    let terms: Term[] = []
    const termsFile = `${pathId}/terms.json`
    if (termsFile in files) {
      const parsed = parse(termsFile, TermsFileSchema)
      if (parsed) {
        terms = parsed.terms
        for (const t of terms) {
          const unit = units[t.unit]
          if (!unit) errors.push(`${termsFile}: termin "${t.id}" yksikköä ${t.unit} ei ole polussa`)
          else if (unit.level !== t.level) {
            errors.push(`${termsFile}: termin "${t.id}" level ${t.level}, mutta yksikkö ${t.unit} on tasolla ${unit.level}`)
          }
        }
      }
    }

    paths.push({ ...path, units, exams, terms })
  }

  for (const file of Object.keys(files)) {
    if (!used.has(file)) errors.push(`${file}: tiedostoa ei ole viitattu mistään (paths.json / path.json)`)
  }

  return { content: { paths }, errors }
}
