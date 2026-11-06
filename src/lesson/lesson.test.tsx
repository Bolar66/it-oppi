import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../routes.tsx'
import { getUnit } from '../content/loader.ts'
import { db } from '../progress/db.ts'
import { answerCorrectly, currentExercise, startExercises } from '../test/answer.ts'

const unit = getUnit('python', 'python-1-01')!
const current = () => currentExercise('python', () => unit.id)

function start(path = '/lesson/python/python-1-01') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('oppitunnin kulku', () => {
  it('teoria → kaikki oikein → virheetön yhteenveto → edistyminen tallentuu', async () => {
    const user = userEvent.setup()
    const router = start()
    await startExercises(user)

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
    const xp = unit.exercises.length * 10 + 20
    expect(screen.getByText(`+${xp} XP`)).toBeInTheDocument()

    const back = screen.getByRole('button', { name: 'Takaisin polulle' })
    await waitFor(() => expect(back).toBeEnabled())
    expect((await db.xpEvents.toArray()).map((e) => e.amount)).toEqual([xp])
    expect(await db.unitProgress.get(unit.id)).toMatchObject({ timesCompleted: 1, bestFirstTry: unit.exercises.length })
    expect(await db.attempts.count()).toBe(unit.exercises.length)
    expect(await db.reviewItems.count()).toBe(0)

    await user.click(back)
    expect(router.state.location.pathname).toBe('/path/python')
    expect(await screen.findByRole('link', { name: `${unit.title} (suoritettu)` })).toBeInTheDocument()
  })

  it('väärä vastaus: oikea vastaus näytetään, kysytään uudelleen ja menee kertausjonoon', async () => {
    const user = userEvent.setup()
    start()
    await startExercises(user)

    const first = current()
    if (first.type !== 'multiple_choice') throw new Error('odotettiin monivalintaa')
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
    expect(screen.getByText(`+${(unit.exercises.length - 1) * 10} XP`)).toBeInTheDocument()
    await waitFor(async () => expect(await db.reviewItems.get(`${unit.id}/${first.id}`)).toMatchObject({ box: 0 }))
  })

  it('näppäimistö: numero valitsee ja Enter tarkistaa ja jatkaa', async () => {
    const user = userEvent.setup()
    start()
    await startExercises(user)
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
    await startExercises(user)
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

  it('lopetus kysyy vahvistuksen eikä tallenna mitään', async () => {
    const user = userEvent.setup()
    const router = start()
    await startExercises(user)
    await answerCorrectly(user, current())
    await user.keyboard('{Enter}{Enter}')
    await user.click(screen.getByRole('button', { name: 'Lopeta oppitunti' }))
    const dialog = screen.getByRole('dialog', { name: 'Lopetetaanko oppitunti?' })
    await user.click(within(dialog).getByRole('button', { name: 'Jatka harjoittelua' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lopeta oppitunti' }))
    await user.click(screen.getByRole('button', { name: 'Lopeta' }))
    expect(router.state.location.pathname).toBe('/path/python')
    expect(await db.xpEvents.count()).toBe(0)
  })

  it('teoria aukeaa kesken harjoitusten', async () => {
    const user = userEvent.setup()
    start()
    await startExercises(user)
    await user.click(screen.getByRole('button', { name: 'Teoria' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Muuttujat' })).toBeInTheDocument()
  })

  it('virheilmoitus tallentuu IndexedDB:hen ja näkyy asetuksissa', async () => {
    const user = userEvent.setup()
    const router = start()
    await startExercises(user)
    await user.click(screen.getByRole('button', { name: /Ilmoita virheestä/ }))
    const dialog = within(screen.getByRole('dialog', { name: 'Ilmoita virheestä' }))
    expect(dialog.getByRole('button', { name: 'Tallenna ilmoitus' })).toBeDisabled()
    await user.type(dialog.getByRole('textbox'), 'Selitys on epäselvä')
    await user.click(dialog.getByRole('button', { name: 'Tallenna ilmoitus' }))
    expect(await dialog.findByText(/Kiitos/)).toBeInTheDocument()
    expect(await db.errorReports.toArray()).toMatchObject([
      { unitId: 'python-1-01', exerciseId: 'e1', message: 'Selitys on epäselvä' },
    ])

    await router.navigate('/settings')
    expect(await screen.findByText('Selitys on epäselvä')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Poista ilmoitus/ }))
    expect(await screen.findByText(/Ei ilmoituksia/)).toBeInTheDocument()
  })
})
