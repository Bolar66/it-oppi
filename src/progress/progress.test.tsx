import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../routes.tsx'
import { getPath, loadUnits } from '../content/loader.ts'
import { answerCorrectly, currentExercise } from '../test/answer.ts'
import { db } from './db.ts'
import { dayKey } from './dates.ts'

const path = getPath('python')!
const level1Units = path.levels.find((l) => l.level === 1)!.units
/** Kokeessa harjoitukset tulevat eri yksiköistä; etsitään yksikkö, jossa näytetty id on. */
const loaded = await loadUnits('python', level1Units)
const unitOf = (exerciseId: string) => loaded.find((u) => u.exercises.some((e) => e.id === exerciseId))!.id

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(<RouterProvider router={router} />)
  return router
}

async function answerAll(user: UserEvent, button: RegExp) {
  while (screen.queryByRole('button', { name: /Seuraava|Lopeta koe/ })) {
    await answerCorrectly(user, currentExercise('python', unitOf))
    await user.click(screen.getByRole('button', { name: button }))
  }
}

async function completeLevel1() {
  const at = new Date().toISOString()
  await db.unitProgress.bulkPut(
    level1Units.map((unitId) => ({
      unitId,
      pathId: 'python',
      completedAt: at,
      timesCompleted: 1,
      bestFirstTry: 0,
      total: 0,
      lastPracticedAt: at,
      viaPlacement: false,
      updatedAt: at,
    })),
  )
}

describe('edistyminen näkymissä', () => {
  it('etusivu näyttää päivän XP:n, putken ja kertausjonon', async () => {
    const today = dayKey(new Date())
    const at = new Date().toISOString()
    await db.xpEvents.add({ id: '1', at, date: today, amount: 30, source: 'lesson', ref: 'python-1-01', updatedAt: at })
    await db.reviewItems.add({
      key: 'python-1-01/e1',
      pathId: 'python',
      unitId: 'python-1-01',
      exerciseId: 'e1',
      box: 0,
      dueDate: today,
      updatedAt: at,
    })
    renderAt('/')
    expect(await screen.findByText('30 / 50 XP')).toBeInTheDocument()
    expect(screen.getByText('Putki 1 pv')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kertaus: 1' })).toBeInTheDocument()
  })

  it('lukittu yksikkö ja koe eivät aukea suoralla osoitteella', async () => {
    renderAt('/exam/python/1')
    expect(await screen.findByText(/Koe aukeaa, kun kaikki tason yksiköt/)).toBeInTheDocument()
  })

  it('tason koe: kaikki oikein → hyväksytty ja tulos tallentuu', async () => {
    await completeLevel1()
    const user = userEvent.setup()
    renderAt('/path/python')
    await user.click(await screen.findByRole('link', { name: /Tason 1 koe/ }))
    await user.click(await screen.findByRole('button', { name: 'Aloita koe' }))
    expect(screen.queryByRole('button', { name: 'Teoria' })).not.toBeInTheDocument()
    await answerAll(user, /Seuraava|Lopeta koe/)
    expect(screen.getByRole('heading', { name: 'Hyväksytty!' })).toBeInTheDocument()
    expect(screen.getByText('100 %')).toBeInTheDocument()
    await waitFor(async () => expect(await db.examResults.toArray()).toMatchObject([{ passed: true, level: 1, kind: 'exam' }]))
  })

  it('tason koe: väärät näytetään lopuksi ja menevät kertaukseen', async () => {
    await completeLevel1()
    const user = userEvent.setup()
    renderAt('/exam/python/1')
    await user.click(await screen.findByRole('button', { name: 'Aloita koe' }))
    let wrongId: string | null = null
    while (screen.queryByRole('button', { name: /Seuraava|Lopeta koe/ })) {
      const ex = currentExercise('python', unitOf)
      if (!wrongId && ex.type === 'multiple_choice') {
        wrongId = ex.id
        await user.click(screen.getByRole('radio', { name: ex.options.find((_, i) => i !== ex.answer)! }))
      } else {
        await answerCorrectly(user, ex)
      }
      await user.click(screen.getByRole('button', { name: /Seuraava|Lopeta koe/ }))
    }
    // 11 kysymystä, 1 väärin = 91 % ≥ 80 % → hyväksytty, mutta virhe käydään läpi.
    expect(screen.getByRole('heading', { name: 'Hyväksytty!' })).toBeInTheDocument()
    expect(screen.getByText('91 %')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Virheet (1)' })).toBeInTheDocument()
    await waitFor(async () => expect(await db.reviewItems.count()).toBe(1))
  })

  it('tasotesti läpi → tason 1 yksiköt suoritetuiksi', async () => {
    const user = userEvent.setup()
    renderAt('/path/python')
    await user.click(await screen.findByRole('link', { name: /Tee tasotesti/ }))
    await user.click(await screen.findByRole('button', { name: 'Aloita tasotesti' }))
    while (screen.queryByRole('button', { name: /Seuraava|Lopeta koe/ })) {
      await answerCorrectly(user, currentExercise('python', unitOf))
      await user.click(screen.getByRole('button', { name: /Seuraava|Lopeta koe/ }))
    }
    expect(screen.getByRole('heading', { name: 'Hyväksytty!' })).toBeInTheDocument()
    await waitFor(async () => expect(await db.unitProgress.count()).toBe(level1Units.length))
    await user.click(screen.getByRole('button', { name: 'Takaisin polulle' }))
    expect(await screen.findByText(/Tason 1 koe läpäisty/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Tee tasotesti/ })).not.toBeInTheDocument()
  })

  it('kertaus: erääntynyt harjoitus oikein → seuraava laatikko', async () => {
    const today = dayKey(new Date())
    await db.reviewItems.add({
      key: 'python-1-01/e2',
      pathId: 'python',
      unitId: 'python-1-01',
      exerciseId: 'e2',
      box: 0,
      dueDate: today,
      updatedAt: '',
    })
    const user = userEvent.setup()
    renderAt('/review')
    await user.click(await screen.findByRole('button', { name: 'Aloita kertaus' }))
    await answerCorrectly(user, currentExercise('python', unitOf))
    await user.click(screen.getByRole('button', { name: 'Tarkista' }))
    await user.click(screen.getByRole('button', { name: 'Jatka' }))
    expect(screen.getByRole('heading', { name: 'Kertaus valmis!' })).toBeInTheDocument()
    await waitFor(async () => expect(await db.reviewItems.get('python-1-01/e2')).toMatchObject({ box: 1 }))
  })

  it('asetukset: päivätavoitteen vaihto', async () => {
    const user = userEvent.setup()
    renderAt('/settings')
    await user.click(await screen.findByRole('radio', { name: '100 XP' }))
    await waitFor(async () => expect(await db.settings.get('dailyGoal')).toMatchObject({ value: 100 }))
    expect(await screen.findByRole('radio', { name: '100 XP' })).toHaveAttribute('aria-checked', 'true')
  })

  it('tilastot näkyvät tyhjällä datalla', async () => {
    renderAt('/stats')
    expect(await screen.findByText('XP yhteensä')).toBeInTheDocument()
    expect(screen.getByText(/Suorita ensimmäinen yksikkö/)).toBeInTheDocument()
  })
})
