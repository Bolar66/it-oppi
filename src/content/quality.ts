import type { ContentTree } from './validate.ts'

/** Yksikössä vähintään näin monta eri harjoitustyyppiä ("sekoitus eri tyyppejä"). */
export const MIN_EXERCISE_TYPES = 3
/** Teorian ohjepituus on ~300 sanaa; tätä pidemmästä varoitetaan. */
export const THEORY_WORD_WARN = 350

export interface QualityReport {
  errors: string[]
  warnings: string[]
}

export function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

/**
 * Sisällön laatusäännöt (CLAUDE.md), skeemojen lisäksi. Ajetaan pnpm validate-content -skriptissä
 * ja testeissä, ei sovelluksen latauksessa.
 */
export function checkQuality(content: ContentTree): QualityReport {
  const errors: string[] = []
  const warnings: string[] = []

  for (const path of content.paths) {
    const termUnits = new Set(path.terms.map((t) => t.unit))
    for (const unit of Object.values(path.units)) {
      const file = `${path.id}/units/${unit.id}.json`
      const types = new Set(unit.exercises.map((e) => e.type))
      if (types.size < MIN_EXERCISE_TYPES) {
        errors.push(`${file}: vain ${types.size} harjoitustyyppiä (vähintään ${MIN_EXERCISE_TYPES})`)
      }
      const words = countWords(unit.theory)
      if (words > THEORY_WORD_WARN) warnings.push(`${file}: teoria ${words} sanaa (ohje ~300)`)
      if (!termUnits.has(unit.id)) warnings.push(`${file}: yksiköllä ei ole termejä terms.json-tiedostossa`)
    }
    for (const lvl of path.levels) {
      if (lvl.units.length > 0 && !path.exams[lvl.level]) {
        warnings.push(`${path.id}: tasolta ${lvl.level} puuttuu exams/level-${lvl.level}.json (käytetään oletusta 20 / 80 %)`)
      }
    }
  }
  return { errors, warnings }
}
