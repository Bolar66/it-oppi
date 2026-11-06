/** Paikallisen ajan päivä muodossa YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key)
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}
