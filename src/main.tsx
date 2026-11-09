import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes.tsx'
import { migrateLegacyReports } from './progress/repo.ts'
import { AuthProvider } from './sync/auth.tsx'
import AuthGate from './sync/AuthGate.tsx'
import './index.css'

// Vaiheen 2 localStorage-virheilmoitukset IndexedDB:hen (kerran).
void migrateLegacyReports().catch((e: unknown) => console.error('Virheilmoitusten siirto epäonnistui', e))

// Julkaisun alipolku (esim. /it-oppi/) reitittimelle; paikallisesti juuri.
const basename = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL
const router = createBrowserRouter(routes, { basename: basename || '/' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
