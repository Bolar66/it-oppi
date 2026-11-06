import { z } from 'zod'

/** Ohjelmointikielet / syntaksit, joita harjoituksissa voi käyttää. */
export const LanguageSchema = z.enum([
  'python',
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'cpp',
  'kotlin',
  'bash',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'dockerfile',
  'text',
])
export type Language = z.infer<typeof LanguageSchema>

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])
export type Level = z.infer<typeof LevelSchema>

const nonEmpty = z.string().trim().min(1)

/** Aukon merkki fill_blank-harjoituksen koodissa. */
export const BLANK = '___'

const base = {
  id: nonEmpty,
  /** Kysymysteksti. Pakollinen monivalinnassa, muissa sovellus käyttää tyyppikohtaista oletusta. */
  prompt: nonEmpty.optional(),
  explanation: nonEmpty,
}

export const MultipleChoiceSchema = z
  .object({
    ...base,
    type: z.literal('multiple_choice'),
    prompt: nonEmpty,
    options: z.array(nonEmpty).min(2).max(6),
    answer: z.int().min(0),
  })
  .refine((e) => e.answer < e.options.length, {
    message: 'answer-indeksi on vaihtoehtojen ulkopuolella',
    path: ['answer'],
  })
  .refine((e) => new Set(e.options).size === e.options.length, {
    message: 'vaihtoehdoissa on kaksoiskappaleita',
    path: ['options'],
  })

export const CodeOutputSchema = z.object({
  ...base,
  type: z.literal('code_output'),
  language: LanguageSchema,
  code: nonEmpty,
  /** Tarkka tuloste (rivinvaihdot \n). */
  answer: z.string(),
  /** true = vastaus on tarkistettu ajamalla koodi. */
  verified: z.boolean(),
})

/** answers[i] on i:nnen aukon (___) oikea vastaus. */
export const FillBlankSchema = z
  .object({
    ...base,
    type: z.literal('fill_blank'),
    language: LanguageSchema,
    code: nonEmpty,
    answers: z.array(nonEmpty).min(1),
  })
  .refine((e) => e.code.split(BLANK).length - 1 === e.answers.length, {
    message: `aukkojen (${BLANK}) määrä ei vastaa answers-listan pituutta`,
    path: ['answers'],
  })

/** Rivit oikeassa järjestyksessä; sovellus sekoittaa ne. */
export const OrderLinesSchema = z
  .object({
    ...base,
    type: z.literal('order_lines'),
    language: LanguageSchema,
    lines: z.array(z.string().min(1)).min(2).max(12),
  })
  .refine((e) => new Set(e.lines).size === e.lines.length, {
    message: 'samanlaisia rivejä ei voi järjestää yksiselitteisesti',
    path: ['lines'],
  })

/** Parit oikein; sovellus sekoittaa oikean sarakkeen. */
export const MatchPairsSchema = z
  .object({
    ...base,
    type: z.literal('match_pairs'),
    pairs: z.array(z.tuple([nonEmpty, nonEmpty])).min(2).max(6),
  })
  .refine(
    (e) =>
      new Set(e.pairs.map((p) => p[0])).size === e.pairs.length &&
      new Set(e.pairs.map((p) => p[1])).size === e.pairs.length,
    { message: 'parien vasemmissa tai oikeissa arvoissa on kaksoiskappaleita', path: ['pairs'] },
  )

/** bugLine on 1-pohjainen rivinumero. */
export const FindBugSchema = z
  .object({
    ...base,
    type: z.literal('find_bug'),
    language: LanguageSchema,
    code: nonEmpty,
    bugLine: z.int().min(1),
  })
  .refine((e) => e.bugLine <= e.code.split('\n').length, {
    message: 'bugLine on koodin rivimäärää suurempi',
    path: ['bugLine'],
  })

export const ExerciseSchema = z.discriminatedUnion('type', [
  MultipleChoiceSchema,
  CodeOutputSchema,
  FillBlankSchema,
  OrderLinesSchema,
  MatchPairsSchema,
  FindBugSchema,
])
export type Exercise = z.infer<typeof ExerciseSchema>
export type ExerciseType = Exercise['type']

export const UNIT_ID_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)-([123])-(\d{2})$/

export const UnitSchema = z
  .object({
    id: z.string().regex(UNIT_ID_RE, 'id muotoa <polku>-<taso>-<nn>, esim. python-1-03'),
    title: nonEmpty,
    level: LevelSchema,
    theory: nonEmpty,
    exercises: z.array(ExerciseSchema).min(8).max(12),
  })
  .refine((u) => new Set(u.exercises.map((e) => e.id)).size === u.exercises.length, {
    message: 'harjoitusten id:t eivät ole uniikkeja',
    path: ['exercises'],
  })
  .refine((u) => UNIT_ID_RE.exec(u.id)?.[2] === String(u.level), {
    message: 'id:n taso ei vastaa level-kenttää',
    path: ['level'],
  })
export type Unit = z.infer<typeof UnitSchema>

const ThresholdTestSchema = z.object({
  questionCount: z.int().min(1).max(50),
  /** Läpäisyraja 0–1, esim. 0.8 = 80 %. */
  passThreshold: z.number().min(0).max(1),
})

export const PathLevelSchema = z.object({
  level: LevelSchema,
  title: nonEmpty,
  /** Yksiköiden id:t järjestyksessä. */
  units: z.array(nonEmpty),
})

export const PathSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: nonEmpty,
    description: nonEmpty,
    levels: z.array(PathLevelSchema).min(1).max(3),
    /** Tasotesti, jolla voi hypätä tason 1 yli. Kysymykset arvotaan tason 1 yksiköistä. */
    placementTest: ThresholdTestSchema,
  })
  .refine((p) => new Set(p.levels.map((l) => l.level)).size === p.levels.length, {
    message: 'sama taso on määritelty useaan kertaan',
    path: ['levels'],
  })
export type Path = z.infer<typeof PathSchema>

/** Tason koe. Kysymykset arvotaan tason yksiköiden harjoituksista. */
export const ExamSchema = ThresholdTestSchema.extend({ level: LevelSchema })
export type Exam = z.infer<typeof ExamSchema>

/** content/paths.json: polkujen id:t näyttöjärjestyksessä. */
export const PathsIndexSchema = z.object({
  paths: z.array(nonEmpty).min(1),
})
export type PathsIndex = z.infer<typeof PathsIndexSchema>
