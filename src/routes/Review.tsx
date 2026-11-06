import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getUnit } from '../content/loader.ts'
import LessonRunner from '../lesson/LessonRunner.tsx'
import type { LessonItem } from '../lesson/types.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { recordLesson } from '../progress/repo.ts'
import { dueItems } from '../progress/review.ts'

export default function Review() {
  const navigate = useNavigate()
  const progress = useProgress()
  // Kierroksen harjoitukset lukitaan aloitushetkellä, jotta tallennus ei muuta niitä kesken.
  const [session, setSession] = useState<LessonItem[] | null>(null)

  if (session) {
    return (
      <LessonRunner
        mode="review"
        items={session}
        theoryFor={(item) => {
          const unit = getUnit(item.pathId, item.unitId)
          return unit && { title: unit.title, theory: unit.theory }
        }}
        onFinish={recordLesson}
        onExit={() => navigate('/')}
      />
    )
  }

  const due = progress ? dueItems(progress.reviewItems, dayKey(new Date())) : []
  const waiting = progress ? progress.reviewItems.length - due.length : 0

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-slate-400">
        ← Takaisin
      </Link>
      <h1 className="text-2xl font-bold">Kertaus</h1>
      {!progress ? (
        <p className="text-slate-400">Ladataan…</p>
      ) : due.length === 0 ? (
        <div className="space-y-2 rounded-xl bg-slate-800 p-4">
          <p>Ei kerrattavaa tänään. 🎉</p>
          {waiting > 0 && <p className="text-sm text-slate-400">{waiting} harjoitusta odottaa myöhempää kertausta.</p>}
        </div>
      ) : (
        <>
          <p className="text-slate-300">
            Kerrattavana {due.length} harjoitusta. Oikein mennyt siirtyy harvempaan kertaukseen (1 → 3 → 7 → 14 pv),
            väärin mennyt palaa huomiselle.
          </p>
          <button
            type="button"
            onClick={() => setSession(due)}
            className="w-full rounded-2xl bg-accent-dark py-4 text-lg font-semibold text-white"
          >
            Aloita kertaus
          </button>
        </>
      )}
    </div>
  )
}
