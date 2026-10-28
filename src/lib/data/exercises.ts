import { DEMO_NOW } from "@/lib/format"

import type { Dossier, Exercise } from "./types"

/** Date ISO à midi UTC (évite les décalages de fuseau) */
export function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12)).toISOString()
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addMonthsEnd(year: number, month: number, add: number) {
  const total = year * 12 + (month - 1) + add
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return { y, m, d: lastDayOfMonth(y, m) }
}

function buildExercise(endYear: number, endMonth: number, endDay: number): Exercise {
  const start = new Date(Date.UTC(endYear - 1, endMonth - 1, endDay + 1, 12))
  const startYear = start.getUTCFullYear()
  return {
    start: start.toISOString(),
    end: isoDate(endYear, endMonth, endDay),
    label: startYear === endYear ? `Exercice ${endYear}` : `Exercice ${startYear}-${endYear}`,
  }
}

/** Dernier exercice clos à la date de la démo, et l'exercice précédent. */
export function lastClosedExercises(d: Dossier) {
  const [mm, dd] = d.closing.split("-").map(Number) as [number, number]
  const nowYear = DEMO_NOW.getFullYear()
  let endYear = nowYear
  if (Date.parse(isoDate(endYear, mm, dd)) > DEMO_NOW.getTime()) endYear -= 1
  return {
    current: buildExercise(endYear, mm, dd),
    previous: buildExercise(endYear - 1, mm, dd),
  }
}

/**
 * Date limite de dépôt de la liasse (télédéclaration, délai supplémentaire de 15 jours inclus) :
 * - clôture au 31/12 → 20 mai N+1 (2e jour ouvré suivant le 1er mai + 15 jours) ;
 * - autres clôtures → 3 mois après la clôture + 15 jours.
 */
export function liasseDeadline(exerciseEnd: string) {
  const end = new Date(exerciseEnd)
  const y = end.getUTCFullYear()
  const m = end.getUTCMonth() + 1
  if (m === 12 && end.getUTCDate() === 31) return isoDate(y + 1, 5, 20)
  const t = addMonthsEnd(y, m, 3)
  return new Date(Date.UTC(t.y, t.m - 1, t.d + 15, 12)).toISOString()
}

/** Approbation des comptes : 6 mois après la clôture */
export function agDeadline(exerciseEnd: string) {
  const end = new Date(exerciseEnd)
  const t = addMonthsEnd(end.getUTCFullYear(), end.getUTCMonth() + 1, 6)
  return isoDate(t.y, t.m, t.d)
}

/** Dépôt des comptes au greffe : 2 mois après l'AG en dépôt électronique */
export function greffeDeadline(exerciseEnd: string) {
  const ag = new Date(agDeadline(exerciseEnd))
  const t = addMonthsEnd(ag.getUTCFullYear(), ag.getUTCMonth() + 1, 2)
  return isoDate(t.y, t.m, t.d)
}

/** Libellés des 12 mois de l'exercice (« janv. », « févr. »…) */
export function exerciseMonths(exercise: Exercise) {
  const start = new Date(exercise.start)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 15, 12))
    return {
      iso: d.toISOString(),
      month: d.getUTCMonth() + 1,
      label: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(d),
    }
  })
}
