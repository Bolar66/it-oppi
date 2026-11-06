import { Link } from 'react-router'
import { content } from '../content/loader.ts'

const DAILY_GOAL_XP = 50

export default function Home() {
  const first = content.paths[0]
  const firstUnitId = first?.levels[0]?.units[0]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">IT-oppi</h1>
        <p className="text-sm text-slate-400">Tietotekniikkaa perusteista syventäviin aiheisiin</p>
      </header>

      {/* Edistymisen luvut tulevat IndexedDB:stä vaiheessa 3. */}
      <section aria-label="Päivän tilanne" className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Päivän tavoite" value={`0 / ${DAILY_GOAL_XP} XP`} />
        <Stat label="Putki" value="0 pv" />
        <Stat label="Kertausjono" value="0" />
      </section>

      {first && firstUnitId && (
        <Link
          to={`/lesson/${first.id}/${firstUnitId}`}
          className="block rounded-2xl bg-accent-dark px-4 py-4 text-center text-lg font-semibold text-white shadow active:translate-y-0.5"
        >
          Jatka siitä mihin jäit
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Polut</h2>
        <ul className="space-y-3">
          {content.paths.map((p) => (
            <li key={p.id}>
              <Link
                to={`/path/${p.id}`}
                className="block rounded-xl border border-slate-700 bg-slate-800 p-4 active:bg-slate-700"
              >
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-slate-400">{p.description}</div>
                <div className="mt-1 text-xs text-slate-500">{Object.keys(p.units).length} yksikköä</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800 p-3">
      <div className="text-base font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
