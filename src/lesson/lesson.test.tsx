import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../routes.tsx'
import { getUnit } from '../content/loader.ts'
import type { Exercise } from '../schemas/content.ts'
import { loadReports } from '../reports/errorReports.ts'

const unit = getUnit('python', 'python-1-01')!

function start() {
  const router = createMemoryRouter(routes, { initialEntries: ['/lesson/python/python-1-01'] })
  render(<RouterProvider router={router} />)
  return router
}

function current(): Exercise {
  const id = screen.getByTestId('exercise').dataset.exerciseId
  return unit.exercises.find((e) => e.id === id)!
}

async function answerCorrectly(user: UserEvent, ex: Exercise) {
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

describe('oppitunnin kulku', () => {
  beforeEach(() => localStorage.clear())

  it('teoria → kaikki harjoitukset oikein → virheetön yhteenveto', async () => {
    const user = userEvent.setup()
    const router = start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))

    for (let i = 0; i < unit.exercises.length; i++) {
      const check = screen.getByRole('button', { name: 'Tarkista' })
      expect(check).toBeDisabled()
      await answerCorrectly(user, current())
      expect(check).toBeEnabled()
      await user.click(check)
      expect(screen.getByRole('status')).toHaveTextContent('Oikein!')
      await user.click(screen.getByRole('button', { name: 'Jatka' }))
    }

    expect(screen.getByRole('heading', { name: 'Virheetön oppitunti!' })).toBeInTheDocument()
    expect(screen.getByText(`+${unit.exercises.length * 10 + 20} XP`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Takaisin polulle' }))
    expect(router.state.location.pathname).toBe('/path/python')
  })

  it('väärä vastaus näyttää oikean vastauksen ja kysytään uudelleen', async () => {
    const user = userEvent.setup()
    start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))

    const first = current()
    expect(first.type).toBe('multiple_choice')
    if (first.type !== 'multiple_choice') return
    const wrong = first.options.find((_, i) => i !== first.answer)!
    await user.click(screen.getByRole('radio', { name: wrong }))
    await user.click(screen.getByRole('button', { name: 'Tarkista' }))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Ei aivan.')
    expect(status).toHaveTextContent(first.options[first.answer]!)
    expect(status).toHaveTextContent(first.explanation)
    await user.click(screen.getByRole('button', { name: 'Jatka' }))

    const seen: string[] = []
    while (!screen.queryByRole('heading', { name: /suoritettu/ })) {
      const ex = current()
      seen.push(ex.id)
      await answerCorrectly(user, ex)
      await user.click(screen.getByRole('button', { name: 'Tarkista' }))
      await user.click(screen.getByRole('button', { name: 'Jatka' }))
    }
    expect(seen.at(-1)).toBe(first.id)
    expect(screen.getByText('+100 XP')).toBeInTheDocument()
  })

  it('näppäimistö: numero valitsee ja Enter tarkistaa ja jatkaa', async () => {
    const user = userEvent.setup()
    start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))
    const first = current()
    if (first.type !== 'multiple_choice') throw new Error('odotettiin monivalintaa')
    await user.keyboard(String(first.answer + 1))
    expect(screen.getByRole('radio', { name: first.options[first.answer] })).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Oikein!')
    await user.keyboard('{Enter}')
    expect(current().id).not.toBe(first.id)
  })

  it('match_pairs: parin voi purkaa napauttamalla uudelleen', async () => {
    const user = userEvent.setup()
    start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))
    while (current().type !== 'match_pairs') {
      await answerCorrectly(user, current())
      await user.keyboard('{Enter}{Enter}')
    }
    const ex = current()
    if (ex.type !== 'match_pairs') return
    const left = within(screen.getByRole('group', { name: 'Vasen sarake' }))
    const right = within(screen.getByRole('group', { name: 'Oikea sarake' }))
    const [l0] = ex.pairs[0]!
    await user.click(left.getByRole('button', { name: l0 }))
    await user.click(right.getByRole('button', { name: ex.pairs[1]![1] }))
    expect(left.getByRole('button', { name: l0 })).toHaveAttribute('aria-pressed', 'true')
    await user.click(left.getByRole('button', { name: l0 }))
    expect(left.getByRole('button', { name: l0 })).toHaveAttribute('aria-pressed', 'false')
    await answerCorrectly(user, ex)
    await user.click(screen.getByRole('button', { name: 'Tarkista' }))
    expect(screen.getByRole('status')).toHaveTextContent('Oikein!')
  })

  it('lopetus kysyy vahvistuksen', async () => {
    const user = userEvent.setup()
    const router = start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))
    await user.click(screen.getByRole('button', { name: 'Lopeta oppitunti' }))
    const dialog = screen.getByRole('dialog', { name: 'Lopetetaanko oppitunti?' })
    await user.click(within(dialog).getByRole('button', { name: 'Jatka harjoittelua' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lopeta oppitunti' }))
    await user.click(screen.getByRole('button', { name: 'Lopeta' }))
    expect(router.state.location.pathname).toBe('/path/python')
  })

  it('teoria aukeaa kesken harjoitusten', async () => {
    const user = userEvent.setup()
    start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))
    await user.click(screen.getByRole('button', { name: 'Teoria' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Muuttujat' })).toBeInTheDocument()
  })

  it('virheilmoitus tallentuu ja näkyy asetuksissa', async () => {
    const user = userEvent.setup()
    const router = start()
    await user.click(screen.getByRole('button', { name: /Aloita harjoitukset/ }))
    await user.click(screen.getByRole('button', { name: /Ilmoita virheestä/ }))
    const dialog = within(screen.getByRole('dialog', { name: 'Ilmoita virheestä' }))
    expect(dialog.getByRole('button', { name: 'Tallenna ilmoitus' })).toBeDisabled()
    await user.type(dialog.getByRole('textbox'), 'Selitys on epäselvä')
    await user.click(dialog.getByRole('button', { name: 'Tallenna ilmoitus' }))
    expect(dialog.getByText(/Kiitos/)).toBeInTheDocument()
    expect(loadReports()).toMatchObject([{ unitId: 'python-1-01', exerciseId: 'e1', message: 'Selitys on epäselvä' }])

    await router.navigate('/settings')
    expect(await screen.findByText('Selitys on epäselvä')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Poista ilmoitus/ }))
    expect(screen.getByText(/Ei ilmoituksia/)).toBeInTheDocument()
  })
})
