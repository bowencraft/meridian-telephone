import { lazy, Suspense, useEffect, useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { TelephoneScene } from '../components/TelephoneScene'
import { checkAdminSession, type AdminSessionState } from '../game/adminAuth'
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
  const [adminSession, setAdminSession] = useState<AdminSessionState | null>(null)

  useEffect(() => {
    const sync = () => {
      setRoute(readRoute())
      setAdminSession(null)
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

  useEffect(() => {
    if (route !== 'admin') return
    let active = true
    void checkAdminSession().then((session) => {
      if (active) setAdminSession(session)
    })
    return () => { active = false }
  }, [route])

  if (route === 'admin') {
    if (!adminSession) return <RouteLoading />
    if (!adminSession.authenticated) return <AdminGate session={adminSession} onUnlock={() => setAdminSession({ ...adminSession, authenticated: true })} />
    return <Suspense fallback={<RouteLoading />}><AdminPanel /></Suspense>
  }
  if (route === 'record') return <Suspense fallback={<RouteLoading />}><CallRecord /></Suspense>
  return <TelephoneScene />
}

function RouteLoading() {
  return <main className="route-loading" aria-live="polite"><span>GPO EXCHANGE</span><strong>正在接通线路…</strong></main>
}
