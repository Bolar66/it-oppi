import { useEffect, useReducer, useRef, useState } from 'react'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { isComplete } from '../exercises/grade.ts'
import Sheet from '../components/Sheet.tsx'
import Theory from '../components/Theory.tsx'
import ConfirmExit from '../components/ConfirmExit.tsx'
import ReportSheet from '../reports/ReportSheet.tsx'
import type { LessonOutcome } from '../progress/repo.ts'
import { PERFECT_BONUS_XP, XP_PER_CORRECT } from '../progress/xp.ts'
import { currentIndex, firstTryList, initLesson, lessonReducer, summarize, type LessonSummary } from './lessonReducer.ts'
import type { LessonItem } from './types.ts'
import { useAnswerKeys } from './useAnswerKeys.ts'

interface Props {
  mode: 'lesson' | 'review'
  items: LessonItem[]
  /** Teoria, joka avataan "Teoria"-napista nykyiselle harjoitukselle. */
  theoryFor: (item: LessonItem) => { title: string; theory: string } | undefined
  /** Kutsutaan kerran, kun kaikki harjoitukset on saatu oikein. */
  onFinish: (outcome: LessonOutcome) => Promise<void>
  onExit: () => void
  onRestart?: () => void
}

type SheetKind = 'theory' | 'report' | 'exit' | null

export default function LessonRunner({ mode, items, theoryFor, onFinish, onExit, onRestart }: Props) {
  const [state, dispatch] = useReducer(
    lessonReducer,
    items.map((i) => i.exercise),
    initLesson,
  )
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const finished = useRef(false)
  const done = state.phase === 'done'
  const item = items[currentIndex(state)]!
  const exercise = item.exercise
  const complete = isComplete(exercise, state.answer)
  const summary = summarize(state, mode === 'lesson')

  useEffect(() => {
    if (!done || finished.current) return
    finished.current = true
    setSaveState('saving')
    onFinish({ mode, items, firstTry: firstTryList(state), log: state.log, xp: summary.xp })
      .then(() => setSaveState('saved'))
      .catch((e: unknown) => {
        console.error(e)
        setSaveState('error')
      })
  }, [done, mode, items, state, summary.xp, onFinish])

  useAnswerKeys({
    enabled: sheet === null && !done,
    exercise,
    allowChoose: state.phase === 'answering',
    onEnter: () => dispatch({ type: state.phase === 'answering' ? 'check' : 'continue' }),
    onChoose: (choice) => dispatch({ type: 'answer', answer: { type: 'multiple_choice', choice } }),
  })

  if (done) {
    return <Summary mode={mode} summary={summary} saveState={saveState} onExit={onExit} onRestart={onRestart} />
  }

  const progress = state.solved / state.exercises.length
  const checked = state.phase === 'feedback'
  const theory = theoryFor(item)

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => setSheet('exit')}
          aria-label={mode === 'lesson' ? 'Lopeta oppitunti' : 'Lopeta kertaus'}
          className="p-1 text-2xl text-slate-400"
        >
          ✕
        </button>
        <div
          role="progressbar"
          aria-label="Edistyminen"
          aria-valuemin={0}
          aria-valuemax={state.exercises.length}
          aria-valuenow={state.solved}
          className="h-3 flex-1 overflow-hidden rounded-full bg-slate-700"
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
        {theory && (
          <button
            type="button"
            onClick={() => setSheet('theory')}
            className="rounded-lg px-2 py-1 text-sm text-slate-300 active:bg-slate-800"
          >
            Teoria
          </button>
        )}
      </header>

      <main className="flex-1 px-4 pt-4 pb-6">
        {mode === 'review' && theory && <p className="mb-2 text-xs text-slate-500">{theory.title}</p>}
        <ExerciseView
          key={state.attempt}
          exercise={exercise}
          answer={state.answer}
          onChange={(answer) => dispatch({ type: 'answer', answer })}
          checked={checked}
        />
        <button
          type="button"
          onClick={() => setSheet('report')}
          className="mt-6 text-xs text-slate-500 underline underline-offset-2"
        >
          ⚑ Ilmoita virheestä
        </button>
      </main>

      <footer
        className={`sticky bottom-0 border-t-2 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          !checked ? 'border-slate-800 bg-slate-900' : state.lastCorrect ? 'border-green-700 bg-green-950' : 'border-rose-700 bg-rose-950'
        }`}
      >
        {checked && (
          <div role="status" className="mb-4 max-h-[45dvh] space-y-2 overflow-y-auto">
            <p className={`text-xl font-bold ${state.lastCorrect ? 'text-green-300' : 'text-rose-300'}`}>
              {state.lastCorrect ? 'Oikein!' : 'Ei aivan.'}
            </p>
            {!state.lastCorrect && (
              <div className="space-y-1 text-rose-100">
                <p className="text-sm font-semibold">Oikea vastaus:</p>
                <CorrectAnswer exercise={exercise} />
              </div>
            )}
            <p className={`text-sm ${state.lastCorrect ? 'text-green-100' : 'text-rose-100'}`}>{exercise.explanation}</p>
            {!state.lastCorrect && <p className="text-xs text-rose-300/80">Tämä kysytään uudelleen lopussa.</p>}
          </div>
        )}
        {checked ? (
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
            onClick={() => dispatch({ type: 'check' })}
            className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white disabled:bg-slate-700 disabled:text-slate-400"
          >
            Tarkista
          </button>
        )}
      </footer>

      {sheet === 'theory' && theory && (
        <Sheet title={theory.title} onClose={() => setSheet(null)}>
          <Theory markdown={theory.theory} />
        </Sheet>
      )}
      {sheet === 'report' && (
        <ReportSheet pathId={item.pathId} unitId={item.unitId} exerciseId={exercise.id} onClose={() => setSheet(null)} />
      )}
      {sheet === 'exit' && (
        <ConfirmExit
          title={mode === 'lesson' ? 'Lopetetaanko oppitunti?' : 'Lopetetaanko kertaus?'}
          message="Tämän kierroksen edistymistä ei tallenneta."
          onCancel={() => setSheet(null)}
          onConfirm={onExit}
        />
      )}
    </div>
  )
}

function Summary({
  mode,
  summary,
  saveState,
  onExit,
  onRestart,
}: {
  mode: 'lesson' | 'review'
  summary: LessonSummary
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  onExit: () => void
  onRestart?: () => void
}) {
  const title =
    mode === 'review' ? 'Kertaus valmis!' : summary.perfect ? 'Virheetön oppitunti!' : 'Oppitunti suoritettu!'
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-8 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-800 p-4">
          <div className="text-3xl font-bold text-accent">+{summary.xp} XP</div>
          <div className="text-sm text-slate-400">ansaittu</div>
        </div>
        <div className="rounded-2xl bg-slate-800 p-4">
          <div className="text-3xl font-bold">
            {summary.firstTryCorrect}/{summary.total}
          </div>
          <div className="text-sm text-slate-400">oikein 1. yrityksellä</div>
        </div>
      </div>
      <p className="text-sm text-slate-400">
        {summary.firstTryCorrect} × {XP_PER_CORRECT} XP
        {mode === 'lesson' && summary.perfect && ` + ${PERFECT_BONUS_XP} XP virheettömyysbonus`}
      </p>
      {saveState === 'error' && (
        <p role="alert" className="text-sm text-rose-400">
          Edistymisen tallennus epäonnistui. Selaimen tallennustila voi olla estetty.
        </p>
      )}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onExit}
          disabled={saveState === 'saving'}
          className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {mode === 'lesson' ? 'Takaisin polulle' : 'Etusivulle'}
        </button>
        {onRestart && (
          <button type="button" onClick={onRestart} className="w-full rounded-2xl bg-slate-700 py-3 font-semibold">
            Tee uudelleen
          </button>
        )}
      </div>
    </div>
  )
}
