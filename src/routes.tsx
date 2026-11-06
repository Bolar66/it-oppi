import type { RouteObject } from 'react-router'
import Layout from './routes/Layout.tsx'
import Home from './routes/Home.tsx'
import PathMap from './routes/PathMap.tsx'
import Lesson from './routes/Lesson.tsx'
import Stats from './routes/Stats.tsx'
import Settings from './routes/Settings.tsx'
import NotFound from './routes/NotFound.tsx'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'path/:pathId', element: <PathMap /> },
      { path: 'stats', element: <Stats /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Oppitunti on koko näytön näkymä ilman alanavigaatiota.
  { path: '/lesson/:pathId/:unitId', element: <Lesson /> },
]
