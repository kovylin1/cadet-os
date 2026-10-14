import { Suspense, lazy, useEffect, useRef } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ROUTES, useRoute } from './lib/routes'
import { Calendar } from './pages/Calendar'
import { Journal } from './pages/Journal'
import { Overview } from './pages/Overview'
import { Settings } from './pages/Settings'
import { CheckInProvider } from './state/checkin'
import { StoreProvider } from './state/store'
import { ToastProvider } from './state/toast'

// Recharts lives only on Performance, so it loads on demand and keeps first paint light.
const Performance = lazy(() => import('./pages/Performance').then((m) => ({ default: m.Performance })))

const PAGES = {
  overview: Overview,
  calendar: Calendar,
  performance: Performance,
  journal: Journal,
  settings: Settings,
}

function Router() {
  const route = useRoute()
  const Page = PAGES[route]
  const first = useRef(true)

  useEffect(() => {
    document.title = `${ROUTES.find((r) => r.id === route)!.label} · CADET OS`
    // On in-app navigation, move focus to main so screen readers announce the new page.
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0 })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [route])

  return (
    <AppShell route={route}>
      <Suspense fallback={<p className="py-12 text-center text-sm text-muted">Loading…</p>}>
        <Page />
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <CheckInProvider>
          <Router />
        </CheckInProvider>
      </StoreProvider>
    </ToastProvider>
  )
}
