import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './routes.tsx'
import { content } from './content/loader.ts'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('reititys ja näkymät', () => {
  it('etusivu näyttää polut ja alanavigaation', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Tänään' })).toBeInTheDocument()
    const polut = screen.getByRole('region', { name: 'Polut' })
    for (const p of content.paths) {
      expect(within(polut).getByRole('link', { name: (name) => name.startsWith(p.title) })).toBeInTheDocument()
    }
    expect(screen.getByRole('navigation', { name: 'Päävalikko' })).toBeInTheDocument()
  })

  it('polkukartta näyttää yksiköt ja vie oppituntiin', async () => {
    const router = renderAt('/path/python')
    expect(await screen.findByRole('heading', { name: 'Taso 1: Perusteet' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Ensimmäinen ohjelma: print ja muuttujat' }))
    expect(router.state.location.pathname).toBe('/lesson/python/python-1-01')
    expect(screen.getByRole('heading', { level: 2, name: 'Muuttujat' })).toBeInTheDocument()
  })

  it('oppitunti renderöi teorian markdownina', () => {
    renderAt('/lesson/python/python-1-01')
    expect(screen.getByRole('heading', { level: 1, name: /print ja muuttujat/ })).toBeInTheDocument()
    expect(screen.getByText(/tulostaa näytölle/).querySelector('code')).toHaveTextContent('print()')
  })

  it.each(['/ei-ole', '/path/ei-ole', '/lesson/python/ei-ole'])('%s näyttää 404-sivun', (path) => {
    renderAt(path)
    expect(screen.getByRole('heading', { name: 'Sivua ei löytynyt' })).toBeInTheDocument()
  })
})
