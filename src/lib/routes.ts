import { useEffect, useState } from 'react'
import { Atom, BookOpen, Calculator, CalendarDays, Gauge, GraduationCap, LineChart, Settings, type LucideIcon } from 'lucide-react'

export type RouteId = 'overview' | 'calendar' | 'study' | 'performance' | 'journal' | 'settings'
export type StudyTab = 'math' | 'physics'

export interface RouteChild {
  id: StudyTab
  label: string
  icon: LucideIcon
}

export const ROUTES: { id: RouteId; label: string; short: string; icon: LucideIcon; children?: RouteChild[] }[] = [
  { id: 'overview', label: 'Overview', short: 'Overview', icon: Gauge },
  { id: 'calendar', label: 'Calendar', short: 'Calendar', icon: CalendarDays },
  {
    id: 'study',
    label: 'Study',
    short: 'Study',
    icon: GraduationCap,
    children: [
      { id: 'math', label: 'Mathematics', icon: Calculator },
      { id: 'physics', label: 'Physics', icon: Atom },
    ],
  },
  { id: 'performance', label: 'Performance', short: 'Stats', icon: LineChart },
  { id: 'journal', label: 'Journal', short: 'Journal', icon: BookOpen },
  { id: 'settings', label: 'Settings', short: 'Settings', icon: Settings },
]

const IDS = new Set<string>(ROUTES.map((r) => r.id))

function parse(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return IDS.has(id) ? (id as RouteId) : 'overview'
}

export function parseStudyTab(hash: string): StudyTab {
  return /^#\/study\/physics/.test(hash) ? 'physics' : 'math'
}

export function href(id: RouteId): string {
  return `#/${id}`
}

export function studyHref(tab: StudyTab): string {
  return `#/study/${tab}`
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

/** Current Study tab (Mathematics / Physics), following the hash. */
export function useStudyTab(): StudyTab {
  const [tab, setTab] = useState<StudyTab>(() => parseStudyTab(window.location.hash))
  useEffect(() => {
    const onChange = () => setTab(parseStudyTab(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return tab
}

export function navigate(id: RouteId) {
  window.location.hash = href(id)
}
