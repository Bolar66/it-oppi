import { NavLink, Outlet } from 'react-router'
import { BookA, ChartColumn, House, Settings, type LucideIcon } from 'lucide-react'

const tabs: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
  { to: '/', label: 'Koti', icon: House, end: true },
  { to: '/terms', label: 'Termit', icon: BookA, end: false },
  { to: '/stats', label: 'Tilastot', icon: ChartColumn, end: false },
  { to: '/settings', label: 'Asetukset', icon: Settings, end: false },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <main className="flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
        <Outlet />
      </main>
      <nav
        aria-label="Päävalikko"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-xl px-2">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group flex flex-col items-center gap-1 pt-2 pb-1.5 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted hover:text-ink'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`inline-flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary-soft' : ''}`}
                    >
                      <Icon size={21} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
