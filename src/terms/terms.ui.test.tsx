import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../routes.tsx'
import { content, getPath } from '../content/loader.ts'
import { db } from '../progress/db.ts'
import { dayKey } from '../progress/dates.ts'

const path = getPath('python')!
/** Kaikkien polkujen termit yhteensä (sanasto näyttää oletuksena kaikki). */
const totalTerms = content.paths.reduce((n, p) => n + p.terms.length, 0)
const termByName = (name: string) => path.terms.find((t) => t.term === name)!

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(<RouterProvider router={router} />)
  return router
}

async function completeUnit() {
  const at = new Date().toISOString()
  await db.unitProgress.put({
    unitId: 'python-1-01',
    pathId: 'python',
    completedAt: at,
    timesCompleted: 1,
    bestFirstTry: 0,
    total: 0,
    lastPracticedAt: at,
    viaPlacement: false,
    updatedAt: at,
  })
}

async function allKnownAndDue() {
  const today = dayKey(new Date())
  await db.termItems.bulkPut(
    path.terms.map((t) => ({ key: `python/${t.id}`, pathId: 'python', termId: t.id, box: 1, dueDate: today, updatedAt: '' })),
  )
}

/** Vastaa näytöllä olevaan termikysymykseen oikein. */
async function answerTerm(user: UserEvent) {
  if (screen.queryByRole('button', { name: 'Näytä vastaus' })) {
    await user.click(screen.getByRole('button', { name: 'Näytä vastaus' }))
    await user.click(screen.getByRole('button', { name: 'Osasin' }))
    return
  }
  const radios = screen.queryByRole('radiogroup', { name: 'Vaihtoehdot' })
  if (radios) {
    const prompt = screen.getByRole('heading', { level: 2 }).textContent!
    const t = path.terms.find((x) => prompt.endsWith(x.definition))!
    await user.click(within(radios).getByRole('radio', { name: t.term }))
  } else {
    const left = within(screen.getByRole('group', { name: 'Vasen sarake' }))
    const right = within(screen.getByRole('group', { name: 'Oikea sarake' }))
    for (const b of left.getAllByRole('button')) {
      const name = b.getAttribute('aria-label')!
      await user.click(b)
      await user.click(right.getByRole('button', { name: termByName(name).definition }))
    }
  }
  await user.click(screen.getByRole('button', { name: 'Tarkista' }))
  expect(screen.getByRole('status')).toHaveTextContent('Oikein!')
  await user.click(screen.getByRole('button', { name: 'Jatka' }))
}

describe('termiosio', () => {
  it('ennen yksikön suoritusta termit ovat lukossa', async () => {
    renderAt('/terms')
    expect(await screen.findByText(/Termit avautuvat, kun suoritat yksiköitä/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: `📖 Sanasto (${totalTerms} termiä)` })).toBeInTheDocument()
  })

  it('sekoitus uusilla termeillä: kortit → +5 XP per osattu → laatikko 1', async () => {
    await completeUnit()
    const user = userEvent.setup()
    renderAt('/terms')
    await user.click(await screen.findByRole('link', { name: /Harjoittele/ }))
    for (let i = 0; i < 10; i++) await answerTerm(user)
    expect(screen.getByRole('heading', { name: 'Termikierros valmis!' })).toBeInTheDocument()
    expect(screen.getByText('+50 XP')).toBeInTheDocument()
    await waitFor(async () => expect(await db.termItems.count()).toBe(10))
    expect((await db.termItems.toArray()).every((t) => t.box === 1)).toBe(true)
    expect(await db.xpEvents.toArray()).toMatchObject([{ source: 'terms', amount: 50 }])
  })

  it('kortti "En osannut" kysytään uudelleen ja menee laatikkoon 0', async () => {
    await completeUnit()
    const user = userEvent.setup()
    renderAt('/terms/practice?mode=card&path=python')
    await user.click(await screen.findByRole('button', { name: 'Näytä vastaus' }))
    await user.click(screen.getByRole('button', { name: 'En osannut' }))
    while (!screen.queryByRole('heading', { name: 'Termikierros valmis!' })) await answerTerm(user)
    expect(screen.getByText('9/10')).toBeInTheDocument()
    await waitFor(async () => expect((await db.termItems.toArray()).filter((t) => t.box === 0)).toHaveLength(1))
  })

  it('tunnistus-tila tutuilla termeillä', async () => {
    await completeUnit()
    await allKnownAndDue()
    const user = userEvent.setup()
    renderAt('/terms/practice?mode=recognize')
    await screen.findByRole('radiogroup', { name: 'Vaihtoehdot' })
    while (!screen.queryByRole('heading', { name: 'Termikierros valmis!' })) await answerTerm(user)
    expect(screen.getByText('10/10')).toBeInTheDocument()
    await waitFor(async () => expect((await db.termItems.toArray()).every((t) => t.box === 2)).toBe(true))
  })

  it('parit-tila', async () => {
    await completeUnit()
    await allKnownAndDue()
    const user = userEvent.setup()
    renderAt('/terms/practice?mode=pairs')
    await screen.findByRole('group', { name: 'Vasen sarake' })
    while (!screen.queryByRole('heading', { name: 'Termikierros valmis!' })) await answerTerm(user)
    expect(screen.getByText('+50 XP')).toBeInTheDocument()
  })

  it('sanasto: haku ja lukitusmerkintä', async () => {
    const user = userEvent.setup()
    renderAt('/terms/glossary')
    expect(await screen.findAllByText('🔒 lukittu')).toHaveLength(totalTerms)
    await user.type(screen.getByRole('searchbox', { name: 'Hae sanastosta' }), 'boolean')
    const list = within(screen.getByRole('region', { name: 'Python' })).getAllByRole('listitem')
    expect(list).toHaveLength(1)
    expect(list[0]).toHaveTextContent('totuusarvo')
  })
})
