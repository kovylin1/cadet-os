import { useEffect, useState } from 'react'
import { BookOpen, CalendarDays, Gauge, LineChart, Settings, type LucideIcon } from 'lucide-react'

export type RouteId = 'overview' | 'calendar' | 'performance' | 'journal' | 'settings'

export const ROUTES: { id: RouteId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const IDS = new Set<string>(ROUTES.map((r) => r.id))

function parse(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return IDS.has(id) ? (id as RouteId) : 'overview'
}

export function href(id: RouteId): string {
  return `#/${id}`
}

/** Hash routing: no server config needed, works from `vite preview` or a static host. */
export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(id: RouteId) {
  window.location.hash = href(id)
}
