import { useEffect, useReducer, useRef, useState } from 'react'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { isComplete } from '../exercises/grade.ts'
import ConfirmExit from '../components/ConfirmExit.tsx'
import { useAnswerKeys } from '../lesson/useAnswerKeys.ts'
import type { TermOutcome } from '../progress/repo.ts'
import { XP_PER_TERM } from '../progress/xp.ts'
import type { Term } from '../schemas/content.ts'
import { BookA, CircleCheck, CircleX, RotateCw, Sparkles } from 'lucide-react'
import { ActionBar, PathIcon } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { Feedback, ResultScreen, RunnerHeader } from '../ui/runner.tsx'
import { buttonClass, surface } from '../ui/styles.ts'
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
      <ResultScreen
        icon={correctCount === results.length ? Sparkles : BookA}
        tone={correctCount === results.length ? 'good' : 'primary'}
        title="Termikierros valmis!"
        stats={[
          { value: `+${correctCount * XP_PER_TERM} XP`, label: 'ansaittu' },
          { value: `${correctCount}/${results.length}`, label: 'osattu heti' },
        ]}
      >
        <ul className={`${surface} divide-y divide-line`}>
          {results.map(({ ref, correct }) => (
            <li key={termKey(ref)} className="flex items-center gap-3 px-4 py-2.5">
              {correct ? (
                <CircleCheck size={18} className="shrink-0 text-good" aria-hidden />
              ) : (
                <CircleX size={18} className="shrink-0 text-bad" aria-hidden />
              )}
              <span className="font-semibold">{ref.term.term}</span>
              <span className="sr-only">{correct ? ' osattu' : ' ei osattu'}</span>
            </li>
          ))}
        </ul>
        {saveState === 'error' && (
          <p role="alert" className="text-center text-sm text-bad">
            Tuloksia ei saatu tallennettua.
          </p>
        )}
        <button type="button" onClick={onExit} disabled={saveState === 'saving'} className={buttonClass('primary')}>
          Takaisin termeihin
        </button>
      </ResultScreen>
    )
  }

  if (!q) return null
  const checked = state.phase === 'feedback'
  const complete = q.kind !== 'card' && !!state.answer && isComplete(q.exercise, state.answer)

  return (
    <div className="flex min-h-dvh flex-col">
      <RunnerHeader
        onExit={() => setConfirmExit(true)}
        exitLabel="Lopeta termikierros"
        value={state.position}
        max={state.queue.length}
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-3 pb-8">
        {q.kind === 'card' ? (
          <Card
            key={state.attempt}
            pathId={q.refs[0].pathId}
            term={q.refs[0].term}
            flipped={state.flipped}
            onFlip={() => dispatch({ type: 'flip' })}
          />
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

      <ActionBar tone={!checked ? 'plain' : state.lastCorrect ? 'good' : 'bad'}>
        {checked && q.kind !== 'card' && (
          <Feedback correct={!!state.lastCorrect}>
            {!state.lastCorrect && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted">Oikea vastaus</p>
                <CorrectAnswer exercise={q.exercise} />
              </div>
            )}
            {q.kind === 'recognize' && <p>{q.exercise.explanation}</p>}
          </Feedback>
        )}
        {q.kind === 'card' ? (
          state.flipped ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => grade([false], false)} className={buttonClass('danger')}>
                En osannut
              </button>
              <button type="button" onClick={() => grade([true], false)} className={buttonClass('good')}>
                Osasin
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => dispatch({ type: 'flip' })} className={buttonClass('primary')}>
              Näytä vastaus
            </button>
          )
        ) : checked ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'continue' })}
            className={buttonClass(state.lastCorrect ? 'good' : 'bad')}
          >
            Jatka
          </button>
        ) : (
          <button type="button" disabled={!complete} onClick={check} className={buttonClass('primary')}>
            Tarkista
          </button>
        )}
      </ActionBar>

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

function Card({ pathId, term, flipped, onFlip }: { pathId: string; term: Term; flipped: boolean; onFlip: () => void }) {
  return (
    <div style={pathTone(pathId)} className="path-tone space-y-3">
      <p className="text-lg font-bold">{flipped ? 'Osasitko?' : 'Muistatko, mitä termi tarkoittaa?'}</p>
      <button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? `Kortti: ${term.term}, käännetty` : `Kortti: ${term.term}. Käännä kortti`}
        className={`${surface} flex min-h-72 w-full flex-col overflow-hidden text-left`}
      >
        <span className="flex items-center gap-2 bg-path-soft px-4 py-2.5 text-sm font-semibold text-path-ink">
          <PathIcon pathId={pathId} size="sm" />
          Termikortti
        </span>
        <span className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="font-display text-3xl font-bold">{term.term}</span>
          {flipped ? (
            <span className="space-y-3">
              {term.en && term.en !== term.term && <span className="block text-sm text-muted italic">{term.en}</span>}
              <span className="block text-lg">{term.definition}</span>
              {term.example && (
                <code className="block rounded-lg bg-code px-3 py-2 font-mono text-sm text-path-ink">{term.example}</code>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <RotateCw size={15} aria-hidden /> Napauta kääntääksesi
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
