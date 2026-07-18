import { lazy, Suspense, useEffect, useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { TelephoneScene } from '../components/TelephoneScene'
import { isAdminUnlocked } from '../game/adminAuth'
import '../styles/telephone.css'

const AdminPanel = lazy(() => import('../components/AdminPanel').then((module) => ({ default: module.AdminPanel })))
const CallRecord = lazy(() => import('../components/CallRecord').then((module) => ({ default: module.CallRecord })))

type Route = 'game' | 'admin' | 'record'

function readRoute(): Route {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (path === 'admin') return 'admin'
  if (path === 'record' || path === 'print') return 'record'
  return 'game'
}

export function App() {
  const [route, setRoute] = useState(readRoute)
  const [adminUnlocked, setAdminUnlocked] = useState(isAdminUnlocked)

  useEffect(() => {
    const sync = () => {
      setRoute(readRoute())
      setAdminUnlocked(isAdminUnlocked())
    }
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-app-route]')
      if (!anchor || anchor.target || anchor.download || anchor.origin !== window.location.origin) return
      event.preventDefault()
      window.history.pushState(null, '', `${anchor.pathname}${anchor.search}`)
      sync()
    }
    window.addEventListener('popstate', sync)
    document.addEventListener('click', navigate)
    return () => {
      window.removeEventListener('popstate', sync)
      document.removeEventListener('click', navigate)
    }
  }, [])

  if (route === 'admin') {
    if (!adminUnlocked) return <AdminGate onUnlock={() => setAdminUnlocked(true)} />
    return <Suspense fallback={<RouteLoading />}><AdminPanel /></Suspense>
  }
  if (route === 'record') return <Suspense fallback={<RouteLoading />}><CallRecord /></Suspense>
  return <TelephoneScene />
}

function RouteLoading() {
  return <main className="route-loading" aria-live="polite"><span>GPO EXCHANGE</span><strong>正在接通线路…</strong></main>
}
