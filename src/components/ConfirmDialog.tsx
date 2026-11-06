import type { ReactNode } from 'react'
import Sheet from './Sheet.tsx'

export default function ConfirmDialog({
  title,
  confirmLabel,
  onCancel,
  onConfirm,
  children,
}: {
  title: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  children: ReactNode
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <div className="py-2 text-slate-300">{children}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 pb-2">
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-700 py-3 font-semibold">
          Peruuta
        </button>
        <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-700 py-3 font-semibold text-white">
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
