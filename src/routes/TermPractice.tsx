import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { content } from '../content/loader.ts'
import { dayKey } from '../progress/dates.ts'
import { useProgress, type ProgressSnapshot } from '../progress/hooks.ts'
import { recordTerms } from '../progress/repo.ts'
import { allTerms, buildQuestions, selectSessionTerms, unlockedTerms, type TermMode } from '../terms/session.ts'
import TermRunner from '../terms/TermRunner.tsx'

const MODES: TermMode[] = ['mixed', 'card', 'recognize', 'pairs']

export default function TermPractice() {
  const [params] = useSearchParams()
  const progress = useProgress()
  const raw = params.get('mode') as TermMode | null
  const mode: TermMode = raw && MODES.includes(raw) ? raw : 'mixed'
  const pathId = params.get('path') || undefined

  if (!progress) return <p className="p-4 text-slate-400">Ladataan…</p>
  return <Session progress={progress} mode={mode} pathId={pathId} />
}

/** Kierros lukitaan aloitushetkellä (tallennus ei muuta sitä kesken). */
function Session({ progress, mode, pathId }: { progress: ProgressSnapshot; mode: TermMode; pathId?: string }) {
  const navigate = useNavigate()
  const back = `/terms${pathId ? `?path=${pathId}` : ''}`
  const [setup] = useState(() => {
    const pool = allTerms(content.paths)
    const session = selectSessionTerms(unlockedTerms(content.paths, progress.completed, pathId), progress.termItems, dayKey(new Date()))
    return { pool, questions: buildQuestions(session, mode, pool) }
  })

  if (setup.questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="rounded-xl bg-slate-800 p-4 text-slate-300">Ei harjoiteltavia termejä juuri nyt.</p>
        <Link to={back} className="text-accent underline">
          Takaisin termeihin
        </Link>
      </div>
    )
  }

  return (
    <TermRunner
      questions={setup.questions}
      mode={mode}
      pool={setup.pool}
      onFinish={recordTerms}
      onExit={() => navigate(back)}
    />
  )
}
