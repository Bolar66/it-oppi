import { useState } from 'react'
import Sheet from '../components/Sheet.tsx'
import { addReport } from './errorReports.ts'

interface Props {
  pathId: string
  unitId: string
  exerciseId: string
  onClose: () => void
}

export default function ReportSheet({ pathId, unitId, exerciseId, onClose }: Props) {
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    try {
      addReport({ pathId, unitId, exerciseId, message: message.trim() })
      setSaved(true)
    } catch {
      setError('Tallennus epäonnistui. Selaimen tallennustila voi olla estetty.')
    }
  }

  return (
    <Sheet title="Ilmoita virheestä" onClose={onClose}>
      {saved ? (
        <div className="space-y-4 py-2">
          <p>Kiitos! Ilmoitus tallennettiin. Löydät sen Asetuksista.</p>
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-slate-700 py-3 font-semibold">
            Sulje
          </button>
        </div>
      ) : (
        <form
          className="space-y-3 py-1"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <p className="text-sm text-slate-400">
            Harjoitus <span className="font-mono">{unitId}/{exerciseId}</span>
          </p>
          <label className="block">
            <span className="mb-1 block text-sm">Mikä on vialla?</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Esim. oikea vastaus on väärin, selitys on epäselvä…"
              className="w-full rounded-xl border-2 border-slate-600 bg-slate-950 px-3 py-2 text-base outline-none focus:border-sky-400"
            />
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={message.trim() === ''}
            className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white disabled:bg-slate-700 disabled:text-slate-400"
          >
            Tallenna ilmoitus
          </button>
        </form>
      )}
    </Sheet>
  )
}
