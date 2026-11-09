import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Alhaalta nouseva paneeli (mobiili). Escape ja taustan napautus sulkevat. */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl"
      >
        <span aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
        <header className="flex items-center justify-between gap-3 px-5 pt-2 pb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sulje"
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
