import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom'

import './index.css'

import AppLayout from './AppLayout'

import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import Model from './pages/Model'
import Species from './pages/Species'
import Map from './pages/Map'
import Timeline from './pages/Timeline'
import Recordings from './pages/Recordings'
import Analysis from './pages/Analysis'
import Admin from './pages/Admin'
import Error from './pages/Error'
import LoginPage from './pages/LoginPage'
import PublicDashboard from './pages/PublicDashboard'

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicDashboard />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'devices',
        element: <Devices />,
      },
      {
        path: 'model',
        element: <Model />,
      },
      {
        path: 'species',
        element: <Species />,
      },
      {
        path: 'map',
        element: <Map />,
      },
      {
        path: 'timeline',
        element: <Timeline />,
      },
      {
        path: 'recordings',
        element: <Recordings />,
      },
      {
        path: 'analysis',
        element: <Analysis />,
      },
      {
        path: 'admin',
        element: <Admin />,
      },
      {
        path: '*',
        element: <Error />,
      },
    ],
  },
])

createRoot(
  document.getElementById('root')
).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)