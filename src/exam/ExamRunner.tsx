import { useState } from 'react'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { emptyAnswer, grade, isComplete, type Answer } from '../exercises/grade.ts'
import ConfirmExit from '../components/ConfirmExit.tsx'
import type { LessonItem } from '../lesson/types.ts'
import { useAnswerKeys } from '../lesson/useAnswerKeys.ts'
import { XP_PER_CORRECT } from '../progress/xp.ts'
import { Target, Trophy } from 'lucide-react'
import { ActionBar } from '../ui/components.tsx'
import { ResultScreen, RunnerHeader } from '../ui/runner.tsx'
import { buttonClass } from '../ui/styles.ts'

interface Props {
  title: string
  items: LessonItem[]
  passThreshold: number
  /** Kutsutaan kerran viimeisen vastauksen jälkeen. */
  onFinish: (correct: boolean[]) => Promise<void>
  onExit: () => void
  /** Teksti läpäisyn jälkeen, esim. "Taso 2 avattu". */
  passMessage: string
}

/** Koe: ei palautetta eikä vihjeitä kesken kokeen; tulos ja virheiden läpikäynti lopuksi. */
export default function ExamRunner({ title, items, passThreshold, onFinish, onExit, passMessage }: Props) {
  const [position, setPosition] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [answer, setAnswer] = useState<Answer>(() => emptyAnswer(items[0]!.exercise))
  const [result, setResult] = useState<boolean[] | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving')
  const [confirmExit, setConfirmExit] = useState(false)

  const item = items[position]
  const complete = !!item && isComplete(item.exercise, answer)

  const next = () => {
    if (!item || !complete || result) return
    const all = [...answers, answer]
    setAnswers(all)
    if (position + 1 < items.length) {
      setPosition(position + 1)
      setAnswer(emptyAnswer(items[position + 1]!.exercise))
      return
    }
    const correct = items.map((it, i) => grade(it.exercise, all[i]!))
    setResult(correct)
    onFinish(correct)
      .then(() => setSaveState('saved'))
      .catch((e: unknown) => {
        console.error(e)
        setSaveState('error')
      })
  }

  useAnswerKeys({
    enabled: !confirmExit && !result,
    exercise: item?.exercise,
    allowChoose: true,
    onEnter: next,
    onChoose: (choice) => setAnswer({ type: 'multiple_choice', choice }),
  })

  if (result) {
    const score = result.filter(Boolean).length
    const ratio = score / items.length
    const passed = ratio >= passThreshold
    const wrong = items.map((it, i) => ({ it, i })).filter(({ i }) => !result[i])
    return (
      <div className="pb-10">
        <ResultScreen
          icon={passed ? Trophy : Target}
          tone={passed ? 'good' : 'bad'}
          kicker={title}
          title={passed ? 'Hyväksytty!' : 'Ei vielä läpi'}
          stats={[
            { value: `${Math.round(ratio * 100)} %`, label: `raja ${Math.round(passThreshold * 100)} %` },
            { value: `${score}/${items.length}`, label: `oikein, +${score * XP_PER_CORRECT} XP` },
          ]}
        >
          <p className="text-center text-sm text-muted">
            {passed ? passMessage : 'Kertaa yksiköitä ja yritä uudelleen. Väärin menneet lisättiin kertausjonoon.'}
          </p>
          {saveState === 'error' && (
            <p role="alert" className="text-center text-sm text-bad">
              Tulosta ei saatu tallennettua.
            </p>
          )}
          <button type="button" onClick={onExit} disabled={saveState === 'saving'} className={buttonClass('primary')}>
            Takaisin polulle
          </button>
        </ResultScreen>

        {wrong.length > 0 && (
          <section aria-label="Virheiden läpikäynti" className="mx-auto max-w-xl space-y-5 px-4">
            <h2 className="text-xl font-bold">Virheet ({wrong.length})</h2>
            {wrong.map(({ it, i }) => (
              <article key={i} className="space-y-4 rounded-2xl border border-line bg-surface p-4">
                <ExerciseView exercise={it.exercise} answer={answers[i]!} onChange={() => {}} checked />
                <div className="space-y-2 rounded-xl bg-good-soft p-3">
                  <p className="text-sm font-semibold text-good">Oikea vastaus</p>
                  <CorrectAnswer exercise={it.exercise} />
                  <p className="text-[0.95rem]">{it.exercise.explanation}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="flex min-h-dvh flex-col">
      <RunnerHeader
        onExit={() => setConfirmExit(true)}
        exitLabel="Keskeytä koe"
        value={position}
        max={items.length}
        aside={
          <span className="shrink-0 font-display text-sm font-semibold text-muted tabular-nums">
            {position + 1}/{items.length}
          </span>
        }
      />
      <main data-unit-id={item.unitId} className="mx-auto w-full max-w-xl flex-1 px-4 pt-3 pb-8">
        <ExerciseView key={position} exercise={item.exercise} answer={answer} onChange={setAnswer} checked={false} />
      </main>
      <ActionBar>
        <button type="button" disabled={!complete} onClick={next} className={buttonClass('primary')}>
          {position + 1 < items.length ? 'Seuraava' : 'Lopeta koe'}
        </button>
      </ActionBar>
      {confirmExit && (
        <ConfirmExit
          title="Keskeytetäänkö koe?"
          message="Keskeytettyä koetta ei tallenneta."
          onCancel={() => setConfirmExit(false)}
          onConfirm={onExit}
        />
      )}
    </div>
  )
}
