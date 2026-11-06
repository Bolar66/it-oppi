import type { RouteObject } from 'react-router'
import Layout from './routes/Layout.tsx'
import Home from './routes/Home.tsx'
import PathMap from './routes/PathMap.tsx'
import Lesson from './routes/Lesson.tsx'
import Review from './routes/Review.tsx'
import Exam from './routes/Exam.tsx'
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
      { path: 'review', element: <Review /> },
      { path: 'stats', element: <Stats /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Oppitunti ja kokeet ovat koko näytön näkymiä ilman alanavigaatiota.
  { path: '/lesson/:pathId/:unitId', element: <Lesson /> },
  { path: '/exam/:pathId/:level', element: <Exam kind="exam" /> },
  { path: '/placement/:pathId', element: <Exam kind="placement" /> },
]
