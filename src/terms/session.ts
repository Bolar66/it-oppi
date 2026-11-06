import type { LoadedPath } from '../content/validate.ts'

type WithTerms = Pick<LoadedPath, 'id' | 'terms'>
import type { Exercise, Term } from '../schemas/content.ts'
import { shuffle, type Rng } from '../exercises/shuffle.ts'
import type { TermItem } from '../progress/types.ts'

export const TERM_SESSION_SIZE = 10
export const PAIRS_GROUP = 5

export interface TermRef {
  pathId: string
  term: Term
}

export const termKey = (r: { pathId: string; term: { id: string } }) => `${r.pathId}/${r.term.id}`

export type TermMode = 'mixed' | 'card' | 'recognize' | 'pairs'

export const MODE_LABELS: Record<TermMode, string> = {
  mixed: 'Sekoitus',
  card: 'Kortit',
  recognize: 'Tunnista termi',
  pairs: 'Parit',
}

/** Kaikki polkujen termit (sanasto). */
export function allTerms(paths: readonly WithTerms[], pathId?: string): TermRef[] {
  return paths
    .filter((p) => !pathId || p.id === pathId)
    .flatMap((p) => p.terms.map((term) => ({ pathId: p.id, term })))
}

/** Avatut termit: yksikkö suoritettu (myös tasotestin kautta). */
export function unlockedTerms(paths: readonly WithTerms[], completed: ReadonlySet<string>, pathId?: string): TermRef[] {
  return allTerms(paths, pathId).filter((r) => completed.has(r.term.unit))
}

export interface SessionTerm extends TermRef {
  isNew: boolean
}

/** Kierroksen termit: ensin erääntyneet (vanhin ensin), sitten uudet sisällön järjestyksessä. */
export function selectSessionTerms(
  unlocked: readonly TermRef[],
  items: readonly TermItem[],
  today: string,
  size = TERM_SESSION_SIZE,
): SessionTerm[] {
  const byKey = new Map(items.map((i) => [i.key, i]))
  const due = unlocked
    .filter((r) => {
      const item = byKey.get(termKey(r))
      return item && item.dueDate <= today
    })
    .sort((a, b) => byKey.get(termKey(a))!.dueDate.localeCompare(byKey.get(termKey(b))!.dueDate))
    .map((r) => ({ ...r, isNew: false }))
  const fresh = unlocked.filter((r) => !byKey.has(termKey(r))).map((r) => ({ ...r, isNew: true }))
  return [...due, ...fresh].slice(0, size)
}

export function termCounts(unlocked: readonly TermRef[], items: readonly TermItem[], today: string) {
  const byKey = new Map(items.map((i) => [i.key, i]))
  let due = 0
  let fresh = 0
  let learned = 0
  for (const r of unlocked) {
    const item = byKey.get(termKey(r))
    if (!item) fresh++
    else {
      if (item.dueDate <= today) due++
      if (item.box >= 3) learned++
    }
  }
  return { due, fresh, learned, unlocked: unlocked.length }
}

// --- Kysymykset ---

export type TermQuestion =
  | { kind: 'card'; refs: [TermRef] }
  | { kind: 'recognize'; refs: [TermRef]; exercise: Exercise }
  | { kind: 'pairs'; refs: TermRef[]; exercise: Exercise }

const label = (t: Term) => (t.en && t.en !== t.term ? `${t.term} (${t.en})` : t.term)

/**
 * Tunnista termi: määritelmä + 4 termivaihtoehtoa. Väärät vaihtoehdot ensisijaisesti
 * saman polun termeistä, sitten muista poluista. Jos muita termejä ei ole, palautetaan null.
 */
export function recognizeQuestion(ref: TermRef, pool: readonly TermRef[], rng: Rng = Math.random): TermQuestion | null {
  const others = (list: readonly TermRef[]) =>
    shuffle(
      list.filter((r) => r.term.term.toLowerCase() !== ref.term.term.toLowerCase()),
      rng,
    ).map((r) => r.term.term)
  const distractors = [...new Set([...others(pool.filter((r) => r.pathId === ref.pathId)), ...others(pool)])].slice(0, 3)
  if (distractors.length === 0) return null
  const options = shuffle([ref.term.term, ...distractors], rng)
  return {
    kind: 'recognize',
    refs: [ref],
    exercise: {
      id: `term:${termKey(ref)}`,
      type: 'multiple_choice',
      prompt: `Mikä termi? ${ref.term.definition}`,
      options,
      answer: options.indexOf(ref.term.term),
      explanation: `${label(ref.term)}: ${ref.term.definition}`,
    },
  }
}

export function pairsQuestion(refs: TermRef[]): TermQuestion {
  return {
    kind: 'pairs',
    refs,
    exercise: {
      id: `terms:${refs.map(termKey).join(',')}`,
      type: 'match_pairs',
      prompt: 'Yhdistä termi ja sen määritelmä.',
      pairs: refs.map((r) => [r.term.term, r.term.definition] as [string, string]),
      explanation: refs.map((r) => `${label(r.term)}: ${r.term.definition}`).join('\n'),
    },
  }
}

/** Kysymys yhdestä termistä uusintaa varten (kortti-tilassa kortti, muuten tunnistus). */
export function singleQuestion(ref: TermRef, mode: TermMode, pool: readonly TermRef[], rng: Rng = Math.random): TermQuestion {
  if (mode !== 'card') {
    const q = recognizeQuestion(ref, pool, rng)
    if (q) return q
  }
  return { kind: 'card', refs: [ref] }
}

/** Jakaa parit viiden ryhmiin; yksinäinen viimeinen termi liitetään edelliseen ryhmään. */
function chunkPairs(refs: TermRef[]): TermRef[][] {
  const groups: TermRef[][] = []
  for (let i = 0; i < refs.length; i += PAIRS_GROUP) groups.push(refs.slice(i, i + PAIRS_GROUP))
  const last = groups.at(-1)
  if (groups.length > 1 && last && last.length === 1) groups[groups.length - 2]!.push(...groups.pop()!)
  return groups
}

/**
 * Rakentaa kierroksen kysymykset.
 * Sekoitus: uudet termit ensin kortteina, tutut tunnistuksena; jos tuttuja on ≥ 4, osa niistä pareina.
 */
export function buildQuestions(session: readonly SessionTerm[], mode: TermMode, pool: readonly TermRef[], rng: Rng = Math.random): TermQuestion[] {
  const single = (r: TermRef) => singleQuestion(r, mode, pool, rng)
  switch (mode) {
    case 'card':
      return session.map((r) => ({ kind: 'card', refs: [r] }))
    case 'recognize':
      return session.map(single)
    case 'pairs':
      if (session.length < 2) return session.map(single)
      return chunkPairs([...session]).map(pairsQuestion)
    case 'mixed': {
      const fresh = session.filter((r) => r.isNew)
      const known = shuffle(
        session.filter((r) => !r.isNew),
        rng,
      )
      const cards: TermQuestion[] = fresh.map((r) => ({ kind: 'card', refs: [r] }))
      if (known.length >= 4) {
        const pairCount = Math.min(PAIRS_GROUP, known.length - Math.floor(known.length / 2))
        const forPairs = known.slice(0, Math.max(2, pairCount))
        const rest = known.slice(forPairs.length)
        return [...cards, ...rest.map(single), pairsQuestion(forPairs)]
      }
      return [...cards, ...known.map(single)]
    }
  }
}
