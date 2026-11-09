import type { ReactNode } from 'react'
import Sheet from './Sheet.tsx'
import { buttonClass } from '../ui/styles.ts'

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
      <div className="text-muted">{children}</div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onCancel} className={buttonClass('secondary', 'md')}>
          Peruuta
        </button>
        <button type="button" onClick={onConfirm} className={buttonClass('danger', 'md')}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
