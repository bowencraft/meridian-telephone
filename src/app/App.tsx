import { lazy, Suspense, useEffect, useState } from 'react'
import { TelephoneScene } from '../components/TelephoneScene'
import '../styles/telephone.css'

const AdminPanel = lazy(() => import('../components/AdminPanel').then((module) => ({ default: module.AdminPanel })))
const CallRecord = lazy(() => import('../components/CallRecord').then((module) => ({ default: module.CallRecord })))

type Route = 'game' | 'admin' | 'record'

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  if (path === 'admin') return 'admin'
  if (path === 'record' || path === 'print') return 'record'
  return 'game'
}

export function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const sync = () => setRoute(readRoute())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (route === 'admin') return <Suspense fallback={<RouteLoading />}><AdminPanel /></Suspense>
  if (route === 'record') return <Suspense fallback={<RouteLoading />}><CallRecord /></Suspense>
  return <TelephoneScene />
}

function RouteLoading() {
  return <main className="route-loading" aria-live="polite"><span>GPO EXCHANGE</span><strong>正在接通线路…</strong></main>
}
