import { useEffect, useReducer, useState } from 'react'
import type { Unit } from '../schemas/content.ts'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { isComplete } from '../exercises/grade.ts'
import Sheet from '../components/Sheet.tsx'
import Theory from '../components/Theory.tsx'
import ReportSheet from '../reports/ReportSheet.tsx'
import { currentExercise, initLesson, lessonReducer, summarize, XP_PER_CORRECT, PERFECT_BONUS_XP } from './lessonReducer.ts'

interface Props {
  pathId: string
  unit: Unit
  onExit: () => void
  onRestart: () => void
}

type SheetKind = 'theory' | 'report' | 'exit' | null

export default function LessonRunner({ pathId, unit, onExit, onRestart }: Props) {
  const [state, dispatch] = useReducer(lessonReducer, unit.exercises, initLesson)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const exercise = currentExercise(state)
  const complete = isComplete(exercise, state.answer)

  // Näppäimistö (kone): Enter = Tarkista/Jatka, 1–6 = monivalinnan vaihtoehto.
  useEffect(() => {
    if (sheet !== null || state.phase === 'done') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inTextarea = target?.tagName === 'TEXTAREA'
      const inInput = inTextarea || target?.tagName === 'INPUT'
      if (e.key === 'Enter') {
        if (inTextarea && !(e.ctrlKey || e.metaKey)) return
        e.preventDefault()
        if (state.phase === 'answering') dispatch({ type: 'check' })
        else dispatch({ type: 'continue' })
        return
      }
      if (!inInput && state.phase === 'answering' && exercise.type === 'multiple_choice' && /^[1-6]$/.test(e.key)) {
        const choice = Number(e.key) - 1
        if (choice < exercise.options.length) dispatch({ type: 'answer', answer: { type: 'multiple_choice', choice } })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet, state.phase, exercise])

  if (state.phase === 'done') {
    return <Summary summary={summarize(state)} onExit={onExit} onRestart={onRestart} />
  }

  const progress = state.solved / state.exercises.length
  const checked = state.phase === 'feedback'

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={() => setSheet('exit')} aria-label="Lopeta oppitunti" className="p-1 text-2xl text-slate-400">
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
        <button type="button" onClick={() => setSheet('theory')} className="rounded-lg px-2 py-1 text-sm text-slate-300 active:bg-slate-800">
          Teoria
        </button>
      </header>

      <main className="flex-1 px-4 pt-4 pb-6">
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
            {!state.lastCorrect && <p className="text-xs text-rose-300/80">Tämä kysytään uudelleen oppitunnin lopussa.</p>}
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

      {sheet === 'theory' && (
        <Sheet title={unit.title} onClose={() => setSheet(null)}>
          <Theory markdown={unit.theory} />
        </Sheet>
      )}
      {sheet === 'report' && (
        <ReportSheet pathId={pathId} unitId={unit.id} exerciseId={exercise.id} onClose={() => setSheet(null)} />
      )}
      {sheet === 'exit' && (
        <Sheet title="Lopetetaanko oppitunti?" onClose={() => setSheet(null)}>
          <p className="py-2 text-slate-300">Tämän oppitunnin edistyminen menetetään.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 pb-2">
            <button type="button" onClick={() => setSheet(null)} className="rounded-xl bg-slate-700 py-3 font-semibold">
              Jatka harjoittelua
            </button>
            <button type="button" onClick={onExit} className="rounded-xl bg-rose-700 py-3 font-semibold text-white">
              Lopeta
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Summary({
  summary,
  onExit,
  onRestart,
}: {
  summary: ReturnType<typeof summarize>
  onExit: () => void
  onRestart: () => void
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-8 text-center">
      <h1 className="text-3xl font-bold">{summary.perfect ? 'Virheetön oppitunti!' : 'Oppitunti suoritettu!'}</h1>
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
        {summary.perfect && ` + ${PERFECT_BONUS_XP} XP virheettömyysbonus`}. XP tallentuu vaiheesta 3 alkaen.
      </p>
      <div className="space-y-3">
        <button type="button" onClick={onExit} className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white">
          Takaisin polulle
        </button>
        <button type="button" onClick={onRestart} className="w-full rounded-2xl bg-slate-700 py-3 font-semibold">
          Tee uudelleen
        </button>
      </div>
    </div>
  )
}
