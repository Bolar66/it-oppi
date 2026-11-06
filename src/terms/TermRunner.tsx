import { useEffect, useReducer, useRef, useState } from 'react'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { isComplete } from '../exercises/grade.ts'
import ConfirmExit from '../components/ConfirmExit.tsx'
import { useAnswerKeys } from '../lesson/useAnswerKeys.ts'
import type { TermOutcome } from '../progress/repo.ts'
import { XP_PER_TERM } from '../progress/xp.ts'
import type { Term } from '../schemas/content.ts'
import { singleQuestion, termKey, type TermMode, type TermQuestion, type TermRef } from './session.ts'
import { currentQuestion, gradeTermQuestion, initTermRun, termReducer } from './termReducer.ts'

interface Props {
  questions: TermQuestion[]
  mode: TermMode
  /** Kaikki termit (uusintakysymysten väärät vaihtoehdot). */
  pool: TermRef[]
  onFinish: (o: TermOutcome) => Promise<unknown>
  onExit: () => void
}

export default function TermRunner({ questions, mode, pool, onFinish, onExit }: Props) {
  const [state, dispatch] = useReducer(termReducer, questions, initTermRun)
  const [confirmExit, setConfirmExit] = useState(false)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving')
  const finished = useRef(false)
  const q = currentQuestion(state)
  const done = state.phase === 'done'

  // Kierroksen termit (ensimmäinen esiintyminen) tulosten järjestämiseen.
  const [refs] = useState(() => {
    const seen = new Map<string, TermRef>()
    for (const qq of questions) for (const r of qq.refs) if (!seen.has(termKey(r))) seen.set(termKey(r), r)
    return [...seen.values()]
  })
  const results = refs.map((r) => ({ ref: r, correct: state.firstTry[termKey(r)] ?? false }))
  const correctCount = results.filter((r) => r.correct).length

  useEffect(() => {
    if (!done || finished.current) return
    finished.current = true
    onFinish({ results: results.map((r) => ({ pathId: r.ref.pathId, termId: r.ref.term.id, correct: r.correct })) })
      .then(() => setSaveState('saved'))
      .catch((e: unknown) => {
        console.error(e)
        setSaveState('error')
      })
  }, [done, results, onFinish])

  const grade = (correct: boolean[], feedback: boolean) => {
    if (!q) return
    const requeue = q.refs.filter((_, i) => !correct[i]).map((r) => singleQuestion(r, mode, pool))
    dispatch({ type: 'graded', correct, requeue, feedback })
  }

  const check = () => {
    if (!q || q.kind === 'card' || !state.answer || !isComplete(q.exercise, state.answer)) return
    grade(gradeTermQuestion(q, state.answer), true)
  }

  useAnswerKeys({
    enabled: !confirmExit && !done,
    exercise: q && q.kind !== 'card' ? q.exercise : undefined,
    allowChoose: state.phase === 'answering',
    onEnter: () => {
      if (!q) return
      if (state.phase === 'feedback') dispatch({ type: 'continue' })
      else if (q.kind === 'card') {
        if (!state.flipped) dispatch({ type: 'flip' })
      } else check()
    },
    onChoose: (choice) => dispatch({ type: 'answer', answer: { type: 'multiple_choice', choice } }),
  })

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-8 text-center">
        <h1 className="text-3xl font-bold">Termikierros valmis!</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-800 p-4">
            <div className="text-3xl font-bold text-accent">+{correctCount * XP_PER_TERM} XP</div>
            <div className="text-sm text-slate-400">ansaittu</div>
          </div>
          <div className="rounded-2xl bg-slate-800 p-4">
            <div className="text-3xl font-bold">
              {correctCount}/{results.length}
            </div>
            <div className="text-sm text-slate-400">osattu heti</div>
          </div>
        </div>
        <ul className="space-y-1 text-left text-sm">
          {results.map(({ ref, correct }) => (
            <li key={termKey(ref)} className="flex gap-2">
              <span aria-hidden className={correct ? 'text-green-400' : 'text-rose-400'}>
                {correct ? '✓' : '✗'}
              </span>
              <span>
                <span className="font-semibold">{ref.term.term}</span>
                <span className="sr-only">{correct ? ' osattu' : ' ei osattu'}</span>
              </span>
            </li>
          ))}
        </ul>
        {saveState === 'error' && (
          <p role="alert" className="text-sm text-rose-400">
            Tallennus epäonnistui.
          </p>
        )}
        <button
          type="button"
          onClick={onExit}
          disabled={saveState === 'saving'}
          className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          Takaisin termeihin
        </button>
      </div>
    )
  }

  if (!q) return null
  const checked = state.phase === 'feedback'
  const complete = q.kind !== 'card' && !!state.answer && isComplete(q.exercise, state.answer)

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={() => setConfirmExit(true)} aria-label="Lopeta termikierros" className="p-1 text-2xl text-slate-400">
          ✕
        </button>
        <div
          role="progressbar"
          aria-label="Edistyminen"
          aria-valuemin={0}
          aria-valuemax={state.queue.length}
          aria-valuenow={state.position}
          className="h-3 flex-1 overflow-hidden rounded-full bg-slate-700"
        >
          <div
            className="h-full rounded-full bg-violet-500 transition-[width] duration-300"
            style={{ width: `${(state.position / state.queue.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-6">
        {q.kind === 'card' ? (
          <Card key={state.attempt} term={q.refs[0].term} flipped={state.flipped} onFlip={() => dispatch({ type: 'flip' })} />
        ) : (
          <ExerciseView
            key={state.attempt}
            exercise={q.exercise}
            answer={state.answer!}
            onChange={(answer) => dispatch({ type: 'answer', answer })}
            checked={checked}
          />
        )}
      </main>

      <footer
        className={`sticky bottom-0 border-t-2 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          !checked ? 'border-slate-800 bg-slate-900' : state.lastCorrect ? 'border-green-700 bg-green-950' : 'border-rose-700 bg-rose-950'
        }`}
      >
        {checked && q.kind !== 'card' && (
          <div role="status" className="mb-4 max-h-[45dvh] space-y-2 overflow-y-auto">
            <p className={`text-xl font-bold ${state.lastCorrect ? 'text-green-300' : 'text-rose-300'}`}>
              {state.lastCorrect ? 'Oikein!' : 'Ei aivan.'}
            </p>
            {!state.lastCorrect && (
              <div className="space-y-1 text-rose-100">
                <p className="text-sm font-semibold">Oikea vastaus:</p>
                <CorrectAnswer exercise={q.exercise} />
              </div>
            )}
            {q.kind === 'recognize' && (
              <p className={`text-sm ${state.lastCorrect ? 'text-green-100' : 'text-rose-100'}`}>{q.exercise.explanation}</p>
            )}
          </div>
        )}
        {q.kind === 'card' ? (
          state.flipped ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => grade([false], false)} className="rounded-2xl bg-rose-700 py-4 text-lg font-semibold text-white">
                En osannut
              </button>
              <button type="button" onClick={() => grade([true], false)} className="rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white">
                Osasin
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'flip' })}
              className="w-full rounded-2xl bg-violet-600 py-4 text-lg font-semibold text-white"
            >
              Näytä vastaus
            </button>
          )
        ) : checked ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'continue' })}
            className={`w-full rounded-2xl py-4 text-lg font-semibold text-white ${state.lastCorrect ? 'bg-green-600' : 'bg-rose-600'}`}
          >
            Jatka
          </button>
        ) : (
          <button
            type="button"
            disabled={!complete}
            onClick={check}
            className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white disabled:bg-slate-700 disabled:text-slate-400"
          >
            Tarkista
          </button>
        )}
      </footer>

      {confirmExit && (
        <ConfirmExit
          title="Lopetetaanko termikierros?"
          message="Tämän kierroksen tuloksia ei tallenneta."
          onCancel={() => setConfirmExit(false)}
          onConfirm={onExit}
        />
      )}
    </div>
  )
}

function Card({ term, flipped, onFlip }: { term: Term; flipped: boolean; onFlip: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{flipped ? 'Osasitko?' : 'Muistatko, mitä termi tarkoittaa?'}</p>
      <button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? `Kortti: ${term.term}, käännetty` : `Kortti: ${term.term}. Käännä kortti`}
        className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-violet-500/60 bg-slate-800 p-6 text-center shadow-lg"
      >
        <span className="text-3xl font-bold">{term.term}</span>
        {flipped ? (
          <span className="space-y-3">
            {term.en && term.en !== term.term && <span className="block text-sm text-violet-300 italic">{term.en}</span>}
            <span className="block text-lg text-slate-100">{term.definition}</span>
            {term.example && (
              <code className="block rounded-lg bg-slate-950 px-3 py-2 font-mono text-sm text-accent">{term.example}</code>
            )}
          </span>
        ) : (
          <span className="text-sm text-slate-500">Napauta kääntääksesi</span>
        )}
      </button>
    </div>
  )
}
