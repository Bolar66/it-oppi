import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccountSection from './AccountSection.tsx'
import AuthGate from './AuthGate.tsx'
import { AuthContext, SignOutSyncError, type AuthApi, type AuthStatus } from './auth.tsx'

function api(status: AuthStatus, overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    status,
    sync: { state: 'idle', error: null },
    sendCode: vi.fn(async () => {}),
    verifyCode: vi.fn(async () => {}),
    syncNow: vi.fn(async () => true),
    signOut: vi.fn(async () => {}),
    ...overrides,
  }
}

function renderGate(value: AuthApi) {
  return render(
    <AuthContext.Provider value={value}>
      <AuthGate>
        <p>Sovellus</p>
      </AuthGate>
    </AuthContext.Provider>,
  )
}

describe('AuthGate', () => {
  it('näyttää sovelluksen kirjautuneelle ja kehitystilassa', () => {
    renderGate(api({ kind: 'signedIn', userId: 'u', email: 'a@b.fi' }))
    expect(screen.getByText('Sovellus')).toBeInTheDocument()
  })

  it('kirjautuminen: sähköposti → koodi', async () => {
    const value = api({ kind: 'signedOut' })
    renderGate(value)
    expect(screen.queryByText('Sovellus')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Sähköposti'), ' Ville@Example.fi ')
    await userEvent.click(screen.getByRole('button', { name: 'Lähetä kirjautumiskoodi' }))
    expect(value.sendCode).toHaveBeenCalledWith('ville@example.fi')

    const login = screen.getByRole('button', { name: 'Kirjaudu' })
    expect(login).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Kirjautumiskoodi'), '123 456')
    await userEvent.click(login)
    expect(value.verifyCode).toHaveBeenCalledWith('ville@example.fi', '123456')
  })

  it('näyttää virheen, jos koodi on väärä', async () => {
    const value = api({ kind: 'signedOut' }, { verifyCode: vi.fn(async () => Promise.reject(new Error('Koodi on väärä'))) })
    renderGate(value)
    await userEvent.type(screen.getByLabelText('Sähköposti'), 'a@b.fi')
    await userEvent.click(screen.getByRole('button', { name: 'Lähetä kirjautumiskoodi' }))
    await userEvent.type(screen.getByLabelText('Kirjautumiskoodi'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Kirjaudu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Koodi on väärä')
  })

  it('ilmoittaa puuttuvista asetuksista', () => {
    renderGate(api({ kind: 'unconfigured' }))
    expect(screen.getByRole('heading', { name: 'Kirjautuminen ei ole käytössä' })).toBeInTheDocument()
  })
})

describe('AccountSection', () => {
  it('piilossa ilman kirjautumista', () => {
    render(<AccountSection />)
    expect(screen.queryByRole('heading', { name: 'Tili' })).not.toBeInTheDocument()
  })

  it('uloskirjautuminen kysyy vahvistuksen ja tarjoaa pakotusta, jos synkka epäonnistuu', async () => {
    const signOut = vi.fn(async (force?: boolean) => {
      if (!force) throw new SignOutSyncError('x')
    })
    render(
      <AuthContext.Provider value={api({ kind: 'signedIn', userId: 'u', email: 'a@b.fi' }, { signOut })}>
        <AccountSection />
      </AuthContext.Provider>,
    )
    expect(screen.getByText('a@b.fi')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Kirjaudu ulos' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Kirjaudu ulos' }))
    expect(signOut).toHaveBeenCalledWith(false)
    await userEvent.click(await screen.findByRole('button', { name: 'Kirjaudu ulos silti' }))
    expect(signOut).toHaveBeenLastCalledWith(true)
  })
})
