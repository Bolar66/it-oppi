import type { RouteObject } from 'react-router'
import Layout from './routes/Layout.tsx'
import Home from './routes/Home.tsx'
import PathMap from './routes/PathMap.tsx'
import Lesson from './routes/Lesson.tsx'
import Review from './routes/Review.tsx'
import Terms from './routes/Terms.tsx'
import Glossary from './routes/Glossary.tsx'
import TermPractice from './routes/TermPractice.tsx'
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
      { path: 'terms', element: <Terms /> },
      { path: 'terms/glossary', element: <Glossary /> },
      { path: 'stats', element: <Stats /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Harjoittelunäkymät ovat koko näytön näkymiä ilman alanavigaatiota
  // (alanavigaatio peittäisi alareunan Tarkista-napin).
  { path: '/review', element: <Review /> },
  { path: '/terms/practice', element: <TermPractice /> },
  { path: '/lesson/:pathId/:unitId', element: <Lesson /> },
  { path: '/exam/:pathId/:level', element: <Exam kind="exam" /> },
  { path: '/placement/:pathId', element: <Exam kind="placement" /> },
]
