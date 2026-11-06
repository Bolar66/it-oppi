import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'
import { getExercise } from '../content/loader.ts'
import type { Exercise } from '../schemas/content.ts'

/** Näytöllä oleva harjoitus (ExerciseView merkitsee sen data-exercise-id:llä). */
export function currentExercise(pathId: string, unitIdFor: (exerciseId: string) => string): Exercise {
  const id = screen.getByTestId('exercise').dataset.exerciseId!
  return getExercise(pathId, unitIdFor(id), id)!
}

export async function answerCorrectly(user: UserEvent, ex: Exercise) {
  switch (ex.type) {
    case 'multiple_choice':
      return user.click(screen.getByRole('radio', { name: ex.options[ex.answer] }))
    case 'code_output':
      await user.click(screen.getByRole('textbox', { name: 'Vastaus' }))
      return user.paste(ex.answer)
    case 'fill_blank':
      for (const [i, value] of ex.answers.entries()) {
        await user.click(screen.getByRole('textbox', { name: `Aukko ${i + 1}` }))
        await user.paste(value)
      }
      return
    case 'order_lines': {
      const pool = screen.getByRole('region', { name: 'Rivit' })
      for (const line of ex.lines) await user.click(within(pool).getByRole('button', { name: line.trim() }))
      return
    }
    case 'match_pairs': {
      const left = screen.getByRole('group', { name: 'Vasen sarake' })
      const right = screen.getByRole('group', { name: 'Oikea sarake' })
      for (const [l, r] of ex.pairs) {
        await user.click(within(left).getByRole('button', { name: l }))
        await user.click(within(right).getByRole('button', { name: r }))
      }
      return
    }
    case 'find_bug':
      return user.click(screen.getByRole('radio', { name: `Rivi ${ex.bugLine}` }))
  }
}

/** Avaa oppitunnin harjoitukset (nappi aktivoituu, kun edistymisdata on ladattu). */
export async function startExercises(user: UserEvent) {
  const button = await screen.findByRole('button', { name: /Aloita harjoitukset/ })
  await waitFor(() => expect(button).toBeEnabled())
  await user.click(button)
}
