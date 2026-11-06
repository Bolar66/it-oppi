import { NavLink, Outlet } from 'react-router'

const tabs = [
  { to: '/', label: 'Koti', icon: '⌂', end: true },
  { to: '/terms', label: 'Termit', icon: 'Aa', end: false },
  { to: '/stats', label: 'Tilastot', icon: '▤', end: false },
  { to: '/settings', label: 'Asetukset', icon: '⚙', end: false },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <main className="flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24">
        <Outlet />
      </main>
      <nav
        aria-label="Päävalikko"
        className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-xl">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-accent' : 'text-slate-400'}`
                }
              >
                <span aria-hidden className="text-xl leading-none">
                  {t.icon}
                </span>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
