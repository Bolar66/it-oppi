import Sheet from './Sheet.tsx'
import { buttonClass } from '../ui/styles.ts'

export default function ConfirmExit({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="text-muted">{message}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onCancel} className={buttonClass('secondary', 'md')}>
          Jatka harjoittelua
        </button>
        <button type="button" onClick={onConfirm} className={buttonClass('danger', 'md')}>
          Lopeta
        </button>
      </div>
    </Sheet>
  )
}
