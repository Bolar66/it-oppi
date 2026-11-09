import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Check, Lock } from 'lucide-react'
import { getPath, loadUnits } from '../content/loader.ts'
import { EmptyState, PageHeader } from '../ui/components.tsx'
import { pathTone } from '../ui/pathStyle.ts'
import { buttonClass, surface } from '../ui/styles.ts'
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
  const [starting, setStarting] = useState<'idle' | 'loading' | 'error'>('idle')

  const level = (kind === 'placement' ? 1 : Number(levelParam)) as Level
  const levelStatus = status?.levels.find((l) => l.level === level)
  if (!path || (status && !levelStatus)) return <Shell><NotFound /></Shell>
  if (!status || !levelStatus) return <Shell><p className="text-muted">Ladataan…</p></Shell>

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
    <Shell pathId={pathId}>
      <PageHeader title={title} back={{ to: `/path/${pathId}`, label: path.title }} />
      {!allowed ? (
        <EmptyState icon={Lock} title={placement ? 'Tasotesti ei ole enää tarjolla' : 'Koe on vielä lukittu'}>
          {placement
            ? 'Taso 1 on jo suoritettu, joten tasotestiä ei tarvita.'
            : 'Koe aukeaa, kun kaikki tason yksiköt on suoritettu.'}
        </EmptyState>
      ) : (
        <>
          <ul className={`${surface} divide-y divide-line`}>
            {[
              `${cfg.questionCount} kysymystä tason ${level} yksiköistä (tai kaikki, jos niitä on vähemmän)`,
              'Ei vihjeitä eikä teoriaa – tulos ja virheet näytetään lopuksi',
              `Läpäisyraja ${Math.round(cfg.passThreshold * 100)} %`,
              ...(placement ? ['Läpäisy merkitsee tason 1 suoritetuksi ja avaa seuraavan tason'] : []),
            ].map((t) => (
              <li key={t} className="flex gap-3 p-3.5">
                <Check size={18} className="mt-0.5 shrink-0 text-path" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          {starting === 'error' && (
            <p role="alert" className="text-sm text-bad">
              Kysymysten lataus epäonnistui.
            </p>
          )}
          <button
            type="button"
            disabled={starting === 'loading'}
            onClick={() => {
              setStarting('loading')
              loadUnits(pathId, levelStatus.units.map((u) => u.unitId)).then(
                (units) => setItems(sampleExam(pathId, units, cfg.questionCount)),
                (e: unknown) => {
                  console.error(e)
                  setStarting('error')
                },
              )
            }}
            className={buttonClass('primary')}
          >
            Aloita {placement ? 'tasotesti' : 'koe'}
          </button>
        </>
      )}
    </Shell>
  )
}

function Shell({ pathId, children }: { pathId?: string; children: ReactNode }) {
  return (
    <div
      style={pathId ? pathTone(pathId) : undefined}
      className="path-tone mx-auto max-w-xl space-y-5 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10"
    >
      {children}
    </div>
  )
}
