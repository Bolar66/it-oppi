import { useState } from 'react'
import ExerciseView from '../exercises/ExerciseView.tsx'
import CorrectAnswer from '../exercises/CorrectAnswer.tsx'
import { emptyAnswer, grade, isComplete, type Answer } from '../exercises/grade.ts'
import ConfirmExit from '../components/ConfirmExit.tsx'
import type { LessonItem } from '../lesson/types.ts'
import { useAnswerKeys } from '../lesson/useAnswerKeys.ts'
import { XP_PER_CORRECT } from '../progress/xp.ts'

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
      <div className="mx-auto max-w-xl space-y-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10">
        <header className="space-y-2 text-center">
          <p className="text-sm text-slate-400">{title}</p>
          <h1 className={`text-3xl font-bold ${passed ? 'text-green-300' : 'text-rose-300'}`}>
            {passed ? 'Hyväksytty!' : 'Ei vielä läpi'}
          </h1>
          <p className="text-4xl font-bold">{Math.round(ratio * 100)} %</p>
          <p className="text-slate-300">
            {score}/{items.length} oikein · raja {Math.round(passThreshold * 100)} % · +{score * XP_PER_CORRECT} XP
          </p>
          <p className="text-sm text-slate-400">
            {passed ? passMessage : 'Kertaa yksiköitä ja yritä uudelleen. Väärin menneet lisättiin kertausjonoon.'}
          </p>
          {saveState === 'error' && (
            <p role="alert" className="text-sm text-rose-400">
              Tuloksen tallennus epäonnistui.
            </p>
          )}
        </header>

        <button
          type="button"
          onClick={onExit}
          disabled={saveState === 'saving'}
          className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          Takaisin polulle
        </button>

        {wrong.length > 0 && (
          <section aria-label="Virheiden läpikäynti" className="space-y-6">
            <h2 className="text-xl font-semibold">Virheet ({wrong.length})</h2>
            {wrong.map(({ it, i }) => (
              <article key={i} className="space-y-3 rounded-2xl border border-slate-700 p-4">
                <ExerciseView exercise={it.exercise} answer={answers[i]!} onChange={() => {}} checked />
                <div className="space-y-1 rounded-xl bg-slate-800 p-3">
                  <p className="text-sm font-semibold text-green-300">Oikea vastaus:</p>
                  <CorrectAnswer exercise={it.exercise} />
                  <p className="pt-1 text-sm text-slate-300">{it.exercise.explanation}</p>
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
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={() => setConfirmExit(true)} aria-label="Keskeytä koe" className="p-1 text-2xl text-slate-400">
          ✕
        </button>
        <div
          role="progressbar"
          aria-label="Kokeen eteneminen"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={position}
          className="h-3 flex-1 overflow-hidden rounded-full bg-slate-700"
        >
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${(position / items.length) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-400">
          {position + 1}/{items.length}
        </span>
      </header>
      <main className="flex-1 px-4 pt-4 pb-6">
        <ExerciseView key={position} exercise={item.exercise} answer={answer} onChange={setAnswer} checked={false} />
      </main>
      <footer className="sticky bottom-0 border-t-2 border-slate-800 bg-slate-900 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!complete}
          onClick={next}
          className="w-full rounded-2xl bg-sky-600 py-4 text-lg font-semibold text-white disabled:bg-slate-700 disabled:text-slate-400"
        >
          {position + 1 < items.length ? 'Seuraava' : 'Lopeta koe'}
        </button>
      </footer>
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
