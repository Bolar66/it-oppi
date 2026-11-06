import { useEffect, useRef } from 'react'
import type { Exercise } from '../schemas/content.ts'

/**
 * Näppäimistö (kone): Enter = ensisijainen toiminto (Tarkista/Jatka/Seuraava),
 * 1–6 = monivalinnan vaihtoehto. Monirivisessä tekstikentässä Enter vaatii Ctrl/Cmd.
 */
export function useAnswerKeys(opts: {
  enabled: boolean
  exercise: Exercise | undefined
  onEnter: () => void
  onChoose: (choice: number) => void
  allowChoose: boolean
}) {
  const ref = useRef(opts)
  useEffect(() => {
    ref.current = opts
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const o = ref.current
      if (!o.enabled) return
      const target = e.target as HTMLElement | null
      const inTextarea = target?.tagName === 'TEXTAREA'
      const inInput = inTextarea || target?.tagName === 'INPUT'
      if (e.key === 'Enter') {
        if (inTextarea && !(e.ctrlKey || e.metaKey)) return
        e.preventDefault()
        o.onEnter()
        return
      }
      if (!inInput && o.allowChoose && o.exercise?.type === 'multiple_choice' && /^[1-6]$/.test(e.key)) {
        const choice = Number(e.key) - 1
        if (choice < o.exercise.options.length) o.onChoose(choice)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
