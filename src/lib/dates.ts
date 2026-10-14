import { format, parseISO, differenceInCalendarDays, isValid } from 'date-fns'

/** Local calendar day key, e.g. "2026-10-14". */
export function toDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromDayKey(key: string): Date {
  return parseISO(key)
}

export function todayKey(): string {
  return toDayKey(new Date())
}

export function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))
}

export function daysUntil(key: string, from: Date = new Date()): number {
  return differenceInCalendarDays(fromDayKey(key), from)
}

export function formatDay(key: string, pattern = 'EEE d MMM yyyy'): string {
  return format(fromDayKey(key), pattern)
}
