export type Rng = () => number

/** Fisher–Yates. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Indeksit 0..n-1 sekoitettuna niin, ettei tulos ole koskaan valmiiksi oikeassa järjestyksessä (kun n ≥ 2). */
export function shuffledIndices(n: number, rng: Rng = Math.random): number[] {
  const ids = Array.from({ length: n }, (_, i) => i)
  if (n < 2) return ids
  for (let tries = 0; tries < 20; tries++) {
    const s = shuffle(ids, rng)
    if (s.some((v, i) => v !== i)) return s
  }
  return [...ids.slice(1), 0]
}
