import Sheet from './Sheet.tsx'

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
      <p className="py-2 text-slate-300">{message}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 pb-2">
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-700 py-3 font-semibold">
          Jatka harjoittelua
        </button>
        <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-700 py-3 font-semibold text-white">
          Lopeta
        </button>
      </div>
    </Sheet>
  )
}
