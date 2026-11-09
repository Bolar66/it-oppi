import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarCheck } from 'lucide-react'
import { getLoadedUnit } from '../content/loader.ts'
import LessonRunner from '../lesson/LessonRunner.tsx'
import type { LessonItem } from '../lesson/types.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress } from '../progress/hooks.ts'
import { recordLesson } from '../progress/repo.ts'
import { dueCount, loadDueItems, REVIEW_SESSION_MAX } from '../progress/review.ts'
import { EmptyState, PageHeader } from '../ui/components.tsx'
import { buttonClass, surface } from '../ui/styles.ts'

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
    <div className="mx-auto max-w-xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <PageHeader
        title="Kertaus"
        back={{ to: '/', label: 'Koti' }}
        subtitle="Väärin menneet harjoitukset palaavat tänne. Oikein vastattu harvenee (1 → 3 → 7 → 14 päivää), väärin vastattu palaa huomiselle."
      />
      {!progress ? (
        <p className="text-muted">Ladataan…</p>
      ) : due === 0 ? (
        <EmptyState icon={CalendarCheck} title="Ei kerrattavaa tänään">
          {waiting > 0
            ? `${waiting} harjoitusta odottaa myöhempää kertausta.`
            : 'Kun jokin harjoitus menee väärin, se tulee tänne kerrattavaksi.'}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <div className={`${surface} flex items-baseline justify-between p-4`}>
            <span className="text-muted">Kerrattavana tänään</span>
            <span className="font-display text-2xl font-bold tabular-nums">{due}</span>
          </div>
          {due > REVIEW_SESSION_MAX && (
            <p className="text-sm text-muted">Yhdellä kierroksella kerrataan {REVIEW_SESSION_MAX} vanhinta.</p>
          )}
          {starting === 'error' && (
            <p role="alert" className="text-sm text-bad">
              Harjoituksia ei saatu ladattua. Yritä uudelleen.
            </p>
          )}
          <button type="button" disabled={starting === 'loading'} onClick={() => void start()} className={buttonClass('primary')}>
            Aloita kertaus
          </button>
        </div>
      )}
    </div>
  )
}
