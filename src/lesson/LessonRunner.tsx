import { useEffect, useReducer, useRef, useState } from 'react'
import { BookOpen, Flag, PartyPopper, Repeat, Sparkles } from 'lucide-react'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { isComplete } from '../exercises/grade.ts'
import Sheet from '../components/Sheet.tsx'
import Theory from '../components/Theory.tsx'
import ConfirmExit from '../components/ConfirmExit.tsx'
import ReportSheet from '../reports/ReportSheet.tsx'
import type { LessonOutcome } from '../progress/repo.ts'
import { PERFECT_BONUS_XP, XP_PER_CORRECT } from '../progress/xp.ts'
import { ActionBar } from '../ui/components.tsx'
import { Feedback, ResultScreen, RunnerHeader } from '../ui/runner.tsx'
import { buttonClass } from '../ui/styles.ts'
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

  const checked = state.phase === 'feedback'
  const theory = theoryFor(item)

  return (
    <div className="flex min-h-dvh flex-col">
      <RunnerHeader
        onExit={() => setSheet('exit')}
        exitLabel={mode === 'lesson' ? 'Lopeta oppitunti' : 'Lopeta kertaus'}
        value={state.solved}
        max={state.exercises.length}
        aside={
          theory && (
            <button
              type="button"
              onClick={() => setSheet('theory')}
              className={buttonClass('ghost', 'sm', 'shrink-0')}
            >
              <BookOpen size={17} aria-hidden />
              Teoria
            </button>
          )
        }
      />

      <main data-unit-id={item.unitId} className="mx-auto w-full max-w-xl flex-1 px-4 pt-3 pb-8">
        {mode === 'review' && theory && <p className="mb-2 text-sm text-muted">{theory.title}</p>}
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
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-faint hover:text-muted"
        >
          <Flag size={14} aria-hidden />
          Ilmoita virheestä
        </button>
      </main>

      <ActionBar tone={!checked ? 'plain' : state.lastCorrect ? 'good' : 'bad'}>
        {checked && (
          <Feedback correct={!!state.lastCorrect}>
            {!state.lastCorrect && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted">Oikea vastaus</p>
                <CorrectAnswer exercise={exercise} />
              </div>
            )}
            <p>{exercise.explanation}</p>
            {!state.lastCorrect && <p className="text-sm text-muted">Tämä kysytään uudelleen lopussa.</p>}
          </Feedback>
        )}
        {checked ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'continue' })}
            className={buttonClass(state.lastCorrect ? 'good' : 'bad')}
          >
            Jatka
          </button>
        ) : (
          <button type="button" disabled={!complete} onClick={() => dispatch({ type: 'check' })} className={buttonClass('primary')}>
            Tarkista
          </button>
        )}
      </ActionBar>

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
  const title = mode === 'review' ? 'Kertaus valmis!' : summary.perfect ? 'Virheetön oppitunti!' : 'Oppitunti suoritettu!'
  return (
    <ResultScreen
      icon={mode === 'review' ? Repeat : summary.perfect ? Sparkles : PartyPopper}
      tone={summary.perfect ? 'good' : 'primary'}
      title={title}
      stats={[
        { value: `+${summary.xp} XP`, label: 'ansaittu' },
        { value: `${summary.firstTryCorrect}/${summary.total}`, label: 'oikein 1. yrityksellä' },
      ]}
    >
      <p className="text-center text-sm text-muted">
        {summary.firstTryCorrect} × {XP_PER_CORRECT} XP
        {mode === 'lesson' && summary.perfect && ` + ${PERFECT_BONUS_XP} XP virheettömyysbonus`}
      </p>
      {saveState === 'error' && (
        <p role="alert" className="text-center text-sm text-bad">
          Edistymistä ei saatu tallennettua. Selaimen tallennustila voi olla estetty.
        </p>
      )}
      <button type="button" onClick={onExit} disabled={saveState === 'saving'} className={buttonClass('primary')}>
        {mode === 'lesson' ? 'Takaisin polulle' : 'Etusivulle'}
      </button>
      {onRestart && (
        <button type="button" onClick={onRestart} className={buttonClass('secondary')}>
          Tee uudelleen
        </button>
      )}
    </ResultScreen>
  )
}
