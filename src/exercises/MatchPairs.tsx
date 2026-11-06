import { useState } from 'react'
import { choiceClass, type ChoiceState, type ExerciseProps } from './common.ts'
import { shuffledIndices } from './shuffle.ts'

const letter = (i: number) => String.fromCharCode(65 + i)

function Badge({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-600 text-xs font-bold text-white"
    >
      {children}
    </span>
  )
}

export default function MatchPairs({ exercise, answer, onChange, checked }: ExerciseProps<'match_pairs'>) {
  const [rightOrder] = useState(() => shuffledIndices(exercise.pairs.length))
  const [selLeft, setSelLeft] = useState<number | null>(null)
  const [selRight, setSelRight] = useState<number | null>(null)
  const { matches } = answer
  /** Pitkät oikean puolen tekstit (esim. määritelmät): vasen puoli siruina ylhäällä, oikea koko leveydeltä. */
  const stacked = exercise.pairs.some(([, right]) => right.length > 24)

  const setMatches = (next: (number | null)[]) => {
    onChange({ ...answer, matches: next })
    setSelLeft(null)
    setSelRight(null)
  }
  const pair = (left: number, right: number) =>
    setMatches(matches.map((m, i) => (i === left ? right : m === right ? null : m)))

  const clickLeft = (i: number) => {
    if (matches[i] !== null) return setMatches(matches.map((m, j) => (j === i ? null : m)))
    if (selRight !== null) return pair(i, selRight)
    setSelLeft(selLeft === i ? null : i)
  }
  const clickRight = (r: number) => {
    const left = matches.indexOf(r)
    if (left >= 0) return setMatches(matches.map((m, j) => (j === left ? null : m)))
    if (selLeft !== null) return pair(selLeft, r)
    setSelRight(selRight === r ? null : r)
  }

  const leftState = (i: number): ChoiceState => {
    if (checked) return matches[i] === i ? 'correct' : 'wrong'
    if (selLeft === i) return 'selected'
    return 'idle'
  }
  const rightState = (r: number): ChoiceState => {
    const left = matches.indexOf(r)
    if (checked) return left === r ? 'correct' : 'wrong'
    if (selRight === r) return 'selected'
    return 'idle'
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Napauta ensin yhtä kohtaa ja sitten sen paria. Napauta paria uudelleen purkaaksesi sen.</p>
      <div className={stacked ? 'space-y-4' : 'grid grid-cols-2 gap-3'}>
        <div role="group" aria-label="Vasen sarake" className={stacked ? 'flex flex-wrap gap-2' : 'min-w-0 space-y-2'}>
          {exercise.pairs.map(([left], i) => (
            <button
              key={i}
              type="button"
              aria-label={left}
              aria-pressed={selLeft === i || matches[i] !== null}
              disabled={checked}
              onClick={() => clickLeft(i)}
              className={choiceClass(leftState(i), `flex items-center gap-2 font-mono text-sm ${stacked ? 'w-auto!' : ''}`)}
            >
              <Badge>{letter(i)}</Badge>
              <span className="min-w-0 break-words">{left}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Oikea sarake" className="min-w-0 space-y-2">
          {rightOrder.map((r) => {
            const left = matches.indexOf(r)
            return (
              <button
                key={r}
                type="button"
                aria-label={exercise.pairs[r]![1]}
                aria-pressed={selRight === r || left >= 0}
                disabled={checked}
                onClick={() => clickRight(r)}
                className={choiceClass(rightState(r), 'flex items-center gap-2 text-sm')}
              >
                {left >= 0 ? <Badge>{letter(left)}</Badge> : <span aria-hidden className="h-6 w-6 shrink-0" />}
                <span className="min-w-0 break-words">{exercise.pairs[r]![1]}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
