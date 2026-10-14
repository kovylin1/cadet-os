/*
 * Short cockpit-flavoured lines. The tone is "steady professional", not hype:
 * the brief asks for motivation without obsession over perfect scores.
 */
const MESSAGES = [
  'Small corrections, steady flight path.',
  'Aviate first. One clean session today.',
  'Smooth is precise. Precise is quick.',
  'Fly the plan, not the panic.',
  'A good rest day is part of the checklist.',
  'Trend over moments — one score is one data point.',
  'Brief the task, fly the task, debrief the task.',
  'Anticipate, don’t chase.',
  'Consistency beats intensity on long legs.',
  'Stay ahead of the aircraft.',
]

/** Same message all day, changes the next day. */
export function messageFor(date: Date): string {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  )
  return MESSAGES[dayNumber % MESSAGES.length]
}
