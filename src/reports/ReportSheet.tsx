import { useState } from 'react'
import Sheet from '../components/Sheet.tsx'
import { addReport } from '../progress/repo.ts'
import { buttonClass } from '../ui/styles.ts'

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

  const submit = async () => {
    try {
      await addReport({ pathId, unitId, exerciseId, message: message.trim() })
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
          <button type="button" onClick={onClose} className={buttonClass('secondary', 'md', 'w-full')}>
            Sulje
          </button>
        </div>
      ) : (
        <form
          className="space-y-3 py-1"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <p className="text-sm text-muted">
            Harjoitus <span className="font-mono">{unitId}/{exerciseId}</span>
          </p>
          <label className="block">
            <span className="mb-1 block text-sm">Mikä on vialla?</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Esim. oikea vastaus on väärin, selitys on epäselvä…"
              className="w-full rounded-xl border-2 border-line bg-bg px-3 py-2 text-base outline-none focus:border-primary"
            />
          </label>
          {error && <p className="text-sm text-bad">{error}</p>}
          <button type="submit" disabled={message.trim() === ''} className={buttonClass('primary', 'md', 'w-full')}>
            Tallenna ilmoitus
          </button>
        </form>
      )}
    </Sheet>
  )
}
