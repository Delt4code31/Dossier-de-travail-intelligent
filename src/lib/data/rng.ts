/**
 * Générateur pseudo-aléatoire déterministe : une même graine donne toujours
 * les mêmes données fictives (identiques côté serveur et navigateur).
 */

function hashString(input: string) {
  let h = 1779033703 ^ input.length
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof createRng>

export function createRng(seed: string) {
  const next = mulberry32(hashString(seed))
  return {
    next,
    float(min: number, max: number) {
      return min + next() * (max - min)
    },
    int(min: number, max: number) {
      return Math.floor(min + next() * (max - min + 1))
    },
    chance(probability: number) {
      return next() < probability
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)]!
    },
    /** Variation multiplicative autour de 1 (ex. spread 0.1 → 0,9 à 1,1) */
    jitter(spread: number) {
      return 1 + (next() * 2 - 1) * spread
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
      }
      return copy
    },
  }
}

/** Arrondi à l'euro (ou à la centaine pour les gros montants « ronds ») */
export function roundEur(value: number) {
  return Math.round(value)
}
