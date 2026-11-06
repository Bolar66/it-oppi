import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getPath } from '../content/loader.ts'
import ExamRunner from '../exam/ExamRunner.tsx'
import { sampleExam } from '../progress/examSample.ts'
import { useProgress, usePathStatus } from '../progress/hooks.ts'
import { recordExam } from '../progress/repo.ts'
import type { LessonItem } from '../lesson/types.ts'
import type { Level } from '../schemas/content.ts'
import NotFound from './NotFound.tsx'

/** Tason koe (/exam/:pathId/:level) tai tasotesti (/placement/:pathId). */
export default function Exam({ kind }: { kind: 'exam' | 'placement' }) {
  const { pathId = '', level: levelParam } = useParams()
  const navigate = useNavigate()
  const path = getPath(pathId)
  const progress = useProgress()
  const status = usePathStatus(path, progress)
  const [items, setItems] = useState<LessonItem[] | null>(null)

  const level = (kind === 'placement' ? 1 : Number(levelParam)) as Level
  const levelStatus = status?.levels.find((l) => l.level === level)
  if (!path || (status && !levelStatus)) return <Shell><NotFound /></Shell>
  if (!status || !levelStatus) return <Shell><p className="text-slate-400">Ladataan…</p></Shell>

  const placement = kind === 'placement'
  const cfg = placement ? path.placementTest : levelStatus.exam
  const title = placement ? `${path.title}: tasotesti` : `${path.title}: tason ${level} koe`
  const allowed = placement ? status.placementAvailable : levelStatus.exam.available
  const nextLevel = status.levels.find((l) => l.level > level)

  if (items) {
    return (
      <ExamRunner
        title={title}
        items={items}
        passThreshold={cfg.passThreshold}
        passMessage={
          placement
            ? 'Tason 1 yksiköt merkittiin suoritetuiksi.' + (nextLevel ? ` Taso ${nextLevel.level} on nyt auki.` : '')
            : nextLevel
              ? `Taso ${nextLevel.level} on nyt auki.`
              : 'Polun kaikki tasot on suoritettu!'
        }
        onFinish={async (correct) => {
          await recordExam({
            kind,
            pathId,
            level,
            items,
            correct,
            passThreshold: cfg.passThreshold,
            unitsOnPass: placement ? levelStatus.units.map((u) => u.unitId) : undefined,
          })
        }}
        onExit={() => navigate(`/path/${pathId}`)}
      />
    )
  }

  return (
    <Shell>
      <Link to={`/path/${pathId}`} className="text-sm text-slate-400">
        ← Takaisin
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      {!allowed ? (
        <p className="rounded-xl bg-slate-800 p-4 text-slate-300">
          🔒{' '}
          {placement
            ? 'Tasotesti ei ole enää tarjolla, koska taso 1 on jo suoritettu.'
            : 'Koe aukeaa, kun kaikki tason yksiköt on suoritettu.'}
        </p>
      ) : (
        <>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>{cfg.questionCount} kysymystä tason {level} yksiköistä (tai kaikki, jos niitä on vähemmän)</li>
            <li>Ei vihjeitä eikä teoriaa – tulos ja virheet näytetään lopuksi</li>
            <li>Läpäisyraja {Math.round(cfg.passThreshold * 100)} %</li>
            {placement && <li>Läpäisy merkitsee tason 1 suoritetuksi ja avaa tason 2</li>}
          </ul>
          <button
            type="button"
            onClick={() => setItems(sampleExam(path, level, cfg.questionCount))}
            className="w-full rounded-2xl bg-sky-600 py-4 text-lg font-semibold text-white"
          >
            Aloita {placement ? 'tasotesti' : 'koe'}
          </button>
        </>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl space-y-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">{children}</div>
}
