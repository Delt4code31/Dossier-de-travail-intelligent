/**
 * Formats d'affichage (français, fuseau Europe/Paris).
 *
 * La démo utilise une date de référence fixe (DEMO_NOW) pour que les « il y a … »
 * soient identiques côté serveur et navigateur.
 */

export const DEMO_NOW = new Date("2026-10-05T09:30:00+02:00")

const TZ = "Europe/Paris"

const eur0 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const eur2 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEur(value: number, decimals = false) {
  // Évite l'affichage « -0 € » pour les montants arrondis à zéro
  const v = Math.abs(value) < (decimals ? 0.005 : 0.5) ? 0 : value
  return (decimals ? eur2 : eur0).format(v)
}

/** 1 240 000 → « 1,24 M€ », 186 400 → « 186 k€ » */
export function formatEurCompact(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? "−" : ""
  if (abs >= 1_000_000) {
    return `${sign}${formatNumber(abs / 1_000_000, 2)} M€`
  }
  if (abs >= 10_000) {
    return `${sign}${formatNumber(Math.round(abs / 1_000))} k€`
  }
  if (abs >= 1_000) {
    return `${sign}${formatNumber(abs / 1_000, 1)} k€`
  }
  return `${sign}${formatNumber(Math.round(abs))} €`
}

export function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** 0.0823 → « +8,2 % » */
export function formatPct(value: number, decimals = 1, signed = true) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value)
}

/** « 05/10/2026 » */
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ }).format(new Date(iso))
}

/** « 29 sept. 2026 » */
export function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

/** « lundi 5 octobre 2026 » */
export function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

/** « 05/10/2026 à 09:30 » */
export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ }).format(d)
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
  return `${date} à ${time}`
}

/** « sept. 2026 » */
export function formatMonth(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

const rtf = new Intl.RelativeTimeFormat("fr", { style: "short", numeric: "always" })

/** « il y a 13 min », « il y a 6 j », « dans 10 j » (comme Fiscalis) */
export function formatRelative(iso: string, now: Date = DEMO_NOW) {
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return diffSec <= 0 ? "à l'instant" : "dans un instant"
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour")
  if (abs < 86400 * 45) return rtf.format(Math.round(diffSec / 86400), "day")
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month")
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year")
}

/** Nombre de jours (arrondi) entre maintenant et la date, négatif si dépassée. */
export function daysUntil(iso: string, now: Date = DEMO_NOW) {
  const target = new Date(iso)
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((b - a) / 86400000)
}

export function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${formatNumber(count)} ${count > 1 ? (plural ?? `${singular}s`) : singular}`
}
