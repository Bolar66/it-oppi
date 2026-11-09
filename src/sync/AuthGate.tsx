import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, LoaderCircle, Mail, TriangleAlert } from 'lucide-react'
import { buttonClass } from '../ui/styles.ts'
import { useAuth } from './auth.tsx'

/** Sovellus näytetään vain kirjautuneelle käyttäjälle (tai kehitystilassa ilman Supabasea). */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status.kind === 'signedIn' || status.kind === 'local') return children
  if (status.kind === 'loading') {
    return (
      <Screen>
        <p role="status" className="flex items-center justify-center gap-2 text-muted">
          <LoaderCircle size={18} className="animate-spin" aria-hidden />
          Ladataan…
        </p>
      </Screen>
    )
  }
  if (status.kind === 'unconfigured') {
    return (
      <Screen>
        <TriangleAlert size={28} className="mx-auto mb-3 text-bad" aria-hidden />
        <h1 className="text-center text-xl font-bold">Kirjautuminen ei ole käytössä</h1>
        <p className="mt-2 text-center text-muted">Sovelluksen julkaisusta puuttuvat palvelimen asetukset.</p>
      </Screen>
    )
  }
  return <Login />
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </main>
  )
}

const inputClass =
  'w-full min-h-13 rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

function Login() {
  const { sendCode, verifyCode } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Jokin meni vikaan. Yritä uudelleen.')
    } finally {
      setBusy(false)
    }
  }

  const submitEmail = (e: FormEvent) => {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    void run(async () => {
      await sendCode(clean)
      setEmail(clean)
      setCode('')
      setNotice(null)
      setStep('code')
    })
  }

  const submitCode = (e: FormEvent) => {
    e.preventDefault()
    void run(() => verifyCode(email, code.replace(/\D/g, '')))
  }

  const resend = () =>
    void run(async () => {
      await sendCode(email)
      setNotice('Uusi koodi lähetetty.')
    })

  const digits = code.replace(/\D/g, '').length

  return (
    <Screen>
      <h1 className="font-display text-[2rem] leading-tight font-bold">IT-oppi</h1>

      {step === 'email' ? (
        <form onSubmit={submitEmail} className="mt-2">
          <p className="text-muted">Kirjaudu sähköpostilla. Edistymisesi tallentuu tilillesi ja näkyy kaikilla laitteillasi.</p>
          <label htmlFor="login-email" className="mt-8 mb-2 block font-semibold">
            Sähköposti
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nimi@esimerkki.fi"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-bad">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !email.includes('@')} className={buttonClass('primary', 'lg', 'mt-5')}>
            {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Mail size={18} aria-hidden />}
            Lähetä kirjautumiskoodi
          </button>
          <p className="mt-4 text-sm text-faint">Ensimmäisellä kerralla tili luodaan automaattisesti. Salasanaa ei tarvita.</p>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-2">
          <p className="text-muted">
            Lähetimme koodin osoitteeseen <span className="font-semibold break-all text-ink">{email}</span>. Kirjoita se alle.
          </p>
          <label htmlFor="login-code" className="mt-8 mb-2 block font-semibold">
            Kirjautumiskoodi
          </label>
          <input
            id="login-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className={`${inputClass} font-mono text-xl tracking-[0.3em]`}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-bad">
              {error}
            </p>
          )}
          {notice && !error && (
            <p role="status" className="mt-3 text-sm text-good">
              {notice}
            </p>
          )}
          <button type="submit" disabled={busy || digits < 6} className={buttonClass('primary', 'lg', 'mt-5')}>
            {busy && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
            Kirjaudu
          </button>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
              }}
              className={buttonClass('ghost', 'sm', '-ml-3')}
            >
              <ArrowLeft size={16} aria-hidden />
              Vaihda osoite
            </button>
            <button type="button" onClick={resend} disabled={busy} className={buttonClass('ghost', 'sm', '-mr-3')}>
              Lähetä uusi koodi
            </button>
          </div>
          <p className="mt-4 text-sm text-faint">Koodi on voimassa noin tunnin. Tarkista myös roskapostikansio.</p>
        </form>
      )}
    </Screen>
  )
}
