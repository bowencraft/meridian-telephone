import { useEffect, useState } from 'react'
import { AdminPanel } from '../components/AdminPanel'
import { CallRecord } from '../components/CallRecord'
import { TelephoneScene } from '../components/TelephoneScene'
import '../styles/telephone.css'
import '../styles/admin.css'
import '../styles/record.css'

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

  if (route === 'admin') return <AdminPanel />
  if (route === 'record') return <CallRecord />
  return <TelephoneScene />
}
