import { useEffect, type ReactNode } from 'react'

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
      <div aria-hidden className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-2xl bg-slate-900 pb-[env(safe-area-inset-bottom)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Sulje" className="-mr-2 p-2 text-xl text-slate-400">
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  )
}
