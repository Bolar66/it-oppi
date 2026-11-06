import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getLoadedUnit } from '../content/loader.ts'
import LessonRunner from '../lesson/LessonRunner.tsx'
import type { LessonItem } from '../lesson/types.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { recordLesson } from '../progress/repo.ts'
import { dueCount, loadDueItems, REVIEW_SESSION_MAX } from '../progress/review.ts'

export default function Review() {
  const navigate = useNavigate()
  const progress = useProgress()
  // Kierroksen harjoitukset lukitaan aloitushetkellä, jotta tallennus ei muuta niitä kesken.
  const [session, setSession] = useState<LessonItem[] | null>(null)
  const [starting, setStarting] = useState<'idle' | 'loading' | 'error'>('idle')

  if (session) {
    return (
      <LessonRunner
        mode="review"
        items={session}
        theoryFor={(item) => {
          const unit = getLoadedUnit(item.pathId, item.unitId)
          return unit && { title: unit.title, theory: unit.theory }
        }}
        onFinish={recordLesson}
        onExit={() => navigate('/')}
      />
    )
  }

  const today = dayKey(new Date())
  const due = progress ? dueCount(progress.reviewItems, today) : 0
  const waiting = progress ? progress.reviewItems.length - due : 0

  const start = async () => {
    if (!progress) return
    setStarting('loading')
    try {
      const items = await loadDueItems(progress.reviewItems, today)
      if (items.length === 0) return setStarting('error')
      setSession(items)
    } catch (e) {
      console.error(e)
      setStarting('error')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      <Link to="/" className="text-sm text-slate-400">
        ← Takaisin
      </Link>
      <h1 className="text-2xl font-bold">Kertaus</h1>
      {!progress ? (
        <p className="text-slate-400">Ladataan…</p>
      ) : due === 0 ? (
        <div className="space-y-2 rounded-xl bg-slate-800 p-4">
          <p>Ei kerrattavaa tänään. 🎉</p>
          {waiting > 0 && <p className="text-sm text-slate-400">{waiting} harjoitusta odottaa myöhempää kertausta.</p>}
        </div>
      ) : (
        <>
          <p className="text-slate-300">
            Kerrattavana {due} harjoitusta{due > REVIEW_SESSION_MAX && ` (kierroksella ${REVIEW_SESSION_MAX})`}. Oikein mennyt
            siirtyy harvempaan kertaukseen (1 → 3 → 7 → 14 pv), väärin mennyt palaa huomiselle.
          </p>
          {starting === 'error' && (
            <p role="alert" className="text-sm text-rose-400">
              Harjoitusten lataus epäonnistui.
            </p>
          )}
          <button
            type="button"
            disabled={starting === 'loading'}
            onClick={() => void start()}
            className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            Aloita kertaus
          </button>
        </>
      )}
    </div>
  )
}
