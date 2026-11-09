import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'
import { getLoadedExercise } from '../content/loader.ts'
import type { Exercise } from '../schemas/content.ts'

/**
 * Näytöllä oleva harjoitus. ExerciseView merkitsee harjoituksen (data-exercise-id) ja harjoitusnäkymä
 * yksikön (data-unit-id); jos yksikkömerkintää ei ole, käytetään unitIdFor-funktiota. Yksikön pitää olla ladattu.
 */
export function currentExercise(pathId: string, unitIdFor: (exerciseId: string) => string): Exercise {
  const el = screen.getByTestId('exercise')
  const id = el.dataset.exerciseId!
  const unitId = el.closest<HTMLElement>('[data-unit-id]')?.dataset.unitId ?? unitIdFor(id)
  return getLoadedExercise(pathId, unitId, id)!
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
      // Saavutettava nimi tiivistää välilyönnit, joten verrataan samoin tiivistettyyn riviin.
      for (const line of ex.lines) {
        await user.click(within(pool).getByRole('button', { name: line.trim().replace(/\s+/g, ' ') }))
      }
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

/**
 * Vastaa tarkoituksella väärin, jos harjoitustyyppi sen helposti sallii (monivalinta, bugi, tuloste, aukko).
 * Palauttaa false järjestys- ja paritehtävissä, joihin ei vastattu.
 */
export async function answerWrongly(user: UserEvent, ex: Exercise): Promise<boolean> {
  switch (ex.type) {
    case 'multiple_choice':
      await user.click(screen.getByRole('radio', { name: ex.options.find((_, i) => i !== ex.answer)! }))
      return true
    case 'find_bug':
      await user.click(screen.getByRole('radio', { name: `Rivi ${ex.bugLine === 1 ? 2 : 1}` }))
      return true
    case 'code_output':
      await user.click(screen.getByRole('textbox', { name: 'Vastaus' }))
      await user.paste('väärä vastaus')
      return true
    case 'fill_blank':
      for (const [i] of ex.answers.entries()) {
        await user.click(screen.getByRole('textbox', { name: `Aukko ${i + 1}` }))
        await user.paste('väärä')
      }
      return true
    default:
      return false
  }
}

/** Avaa oppitunnin harjoitukset (nappi aktivoituu, kun edistymisdata on ladattu). */
export async function startExercises(user: UserEvent) {
  const button = await screen.findByRole('button', { name: /Aloita harjoitukset/ })
  await waitFor(() => expect(button).toBeEnabled())
  await user.click(button)
}
