import { getFinancials, sumAccounts } from "./balance"
import { getChecks } from "./checks"
import { DOSSIERS, getDossier } from "./dossiers"
import { agDeadline, lastClosedExercises, liasseDeadline } from "./exercises"
import { CYCLES } from "./referentiel"
import { createRng } from "./rng"
import { scenarioFor } from "./scenario"
import type {
  AnnualFile,
  AnnualStatus,
  ControlState,
  CycleProgress,
  CycleStatus,
  Dossier,
  PendingItem,
} from "./types"

/**
 * Dossiers annuels (un par client : le dernier exercice clos au 05/10/2026).
 * Le statut de chaque dossier vient du scénario de démo (scenario.ts).
 */

function addDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString()
}

function minutesBeforeNow(minutes: number) {
  return new Date(Date.parse("2026-10-05T09:30:00+02:00") - minutes * 60_000).toISOString()
}

/** Contrôles sans objet pour le dossier (pas de stock, pas de caisse, pas de salarié…) */
function notApplicable(d: Dossier, controlId: string, cycleCode: string) {
  const { lines } = getFinancials(d)
  const has = (...prefixes: string[]) =>
    lines.some((l) => prefixes.some((p) => l.account.startsWith(p)) && (l.n !== 0 || l.n1 !== 0))
  if (cycleCode === "D" && !has("3")) return true
  if (controlId === "A3" && !has("53")) return true
  if (cycleCode === "F" && d.employees === 0) return true
  if (controlId === "I3" && d.employees === 0) return true
  if (cycleCode === "J" && !has("16", "519")) return true
  if (controlId === "G2" && !(d.taxRegime === "IS_RN" || d.taxRegime === "IS_RSI")) return true
  if (controlId === "G1" && d.vatRegime === "exonere") return true
  return false
}

function buildCycles(d: Dossier, status: AnnualStatus, progress: number, exerciseEnd: string): CycleProgress[] {
  const r = createRng(`cycles:${d.id}`)
  const all = CYCLES.flatMap((c) => c.controls.map((ctrl) => ({ cycle: c.code, id: ctrl.id })))
  const applicable = all.filter((c) => !notApplicable(d, c.id, c.cycle))
  const target = status === "non_demarre" ? 0 : Math.round(applicable.length * progress)

  // Ordre de travail : globalement par cycle, avec un peu de désordre
  const order = applicable
    .map((c, i) => ({ ...c, key: i + r.float(-4, 4) }))
    .sort((a, b) => a.key - b.key)
  const doneIds = new Set(order.slice(0, target).map((c) => c.id))

  const startedAt = addDays(exerciseEnd, r.int(20, 75))
  const reviewedShare = status === "en_revue" ? r.float(0.45, 0.75) : status === "valide" || status === "depose" ? 1 : 0

  return CYCLES.map((cycle, index) => {
    const controls: Record<string, ControlState> = {}
    for (const ctrl of cycle.controls) {
      controls[ctrl.id] = notApplicable(d, ctrl.id, cycle.code) ? "na" : doneIds.has(ctrl.id) ? "done" : "todo"
    }
    const states = Object.values(controls)
    const complete = states.every((s) => s !== "todo")
    const allNa = states.every((s) => s === "na")
    const reviewed = complete && !allNa && index < Math.round(CYCLES.length * reviewedShare)
    const preparedAt = complete && !allNa ? addDays(startedAt, index * r.int(1, 3)) : null
    return {
      code: cycle.code,
      controls,
      preparedBy: preparedAt ? d.team.collaborateur : null,
      preparedAt,
      reviewedBy: reviewed ? d.team.chefMission : null,
      reviewedAt: reviewed && preparedAt ? addDays(preparedAt, r.int(1, 6)) : null,
      comment: "",
    }
  })
}

function buildAnnualFile(d: Dossier): AnnualFile {
  const r = createRng(`annual:${d.id}`)
  const { current, previous } = lastClosedExercises(d)
  const scenario = scenarioFor(d.id)
  const dueDate = liasseDeadline(current.end)
  const filedAt = scenario.status === "depose" ? addDays(dueDate, -r.int(2, 24)) : null
  const cycles = buildCycles(d, scenario.status, scenario.progress, current.end)

  let lastActivityAt: string
  if (filedAt) lastActivityAt = addDays(filedAt, r.int(0, 3))
  else if (scenario.status === "non_demarre") lastActivityAt = minutesBeforeNow(r.int(60 * 20, 60 * 72))
  else lastActivityAt = minutesBeforeNow(r.int(8, 60 * 30))

  return {
    id: d.id,
    dossierId: d.id,
    exercise: current,
    previousExercise: previous,
    status: scenario.status,
    dueDate,
    agDeadline: agDeadline(current.end),
    filedAt,
    cycles,
    lastActivityAt,
  }
}

export const ANNUAL_FILES: AnnualFile[] = DOSSIERS.map(buildAnnualFile)

const byId = new Map(ANNUAL_FILES.map((f) => [f.id, f]))

export function getAnnualFile(id: string) {
  return byId.get(id)
}

/* -------------------------------------------------------------------------- */
/* Avancement                                                                  */
/* -------------------------------------------------------------------------- */

export function cycleStatus(c: CycleProgress): CycleStatus {
  const states = Object.values(c.controls)
  const applicable = states.filter((s) => s !== "na")
  if (applicable.length === 0) return c.reviewedBy ? "revu" : "fait"
  const done = applicable.filter((s) => s === "done").length
  if (done === 0) return "a_faire"
  if (done < applicable.length) return "en_cours"
  return c.reviewedBy ? "revu" : "fait"
}

export function cycleCounts(c: CycleProgress) {
  const states = Object.values(c.controls)
  const applicable = states.filter((s) => s !== "na").length
  const done = states.filter((s) => s === "done").length
  return { done, applicable, total: states.length }
}

/**
 * Avancement global : 85 % pour la préparation (contrôles cochés),
 * 15 % pour la revue des cycles par le chef de mission.
 */
export function fileProgress(cycles: CycleProgress[]) {
  let done = 0
  let applicable = 0
  let reviewed = 0
  let reviewable = 0
  for (const c of cycles) {
    const counts = cycleCounts(c)
    done += counts.done
    applicable += counts.applicable
    if (counts.applicable > 0) {
      reviewable += 1
      if (c.reviewedBy) reviewed += 1
    }
  }
  const prep = applicable ? done / applicable : 0
  const rev = reviewable ? reviewed / reviewable : 0
  return {
    pct: Math.round((prep * 0.85 + rev * 0.15) * 100),
    done,
    applicable,
    reviewed,
    reviewable,
  }
}

/* -------------------------------------------------------------------------- */
/* Points en suspens                                                           */
/* -------------------------------------------------------------------------- */

const GENERIC_ITEMS: { kind: PendingItem["kind"]; cycle: string | null; label: string }[] = [
  { kind: "document", cycle: "A", label: "Relevés bancaires du dernier mois de l'exercice à transmettre" },
  { kind: "document", cycle: "D", label: "Inventaire physique des stocks à la clôture (valorisé)" },
  { kind: "document", cycle: "J", label: "Tableau d'amortissement du nouvel emprunt" },
  { kind: "question", cycle: "E", label: "Confirmer la mise au rebut du véhicule utilitaire" },
  { kind: "question", cycle: "I", label: "Point sur le litige prud'homal en cours (provision ?)" },
  { kind: "document", cycle: "F", label: "Journal de paie annuel et DSN de décembre" },
  { kind: "question", cycle: "C", label: "Statut de la facture impayée la plus ancienne (relance, contentieux ?)" },
  { kind: "technique", cycle: "G", label: "Vérifier le crédit de TVA reportable sur la dernière CA3" },
  { kind: "document", cycle: "H", label: "PV d'AG d'approbation des comptes N-1 signé" },
  { kind: "question", cycle: "B", label: "Factures fournisseurs de la dernière quinzaine non reçues ?" },
  { kind: "technique", cycle: "K", label: "Calcul des charges constatées d'avance (assurances, loyers)" },
]

function buildPendingItems(file: AnnualFile, d: Dossier): PendingItem[] {
  const r = createRng(`pending:${d.id}`)
  const items: PendingItem[] = []
  const checks = getChecks(d)
  const base = (status: AnnualFile["status"]) =>
    ({ non_demarre: 2, en_cours: r.int(3, 5), en_revue: r.int(2, 4), valide: r.int(1, 2), depose: r.int(0, 2) })[status]

  const suspense = checks.find((c) => c.id === "attente" && c.status !== "ok")
  if (suspense && file.status !== "depose") {
    items.push({
      id: `${d.id}-p-attente`,
      annualFileId: file.id,
      kind: "question",
      cycle: "K",
      label: `Justifier les opérations en compte d'attente 471 (${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(suspense.amount ?? 0)})`,
      status: file.status === "en_revue" || file.status === "valide" ? "resolu" : r.chance(0.5) ? "relance" : "ouvert",
      createdAt: addDays(file.exercise.end, r.int(25, 60)),
      createdBy: d.team.collaborateur,
      assignee: "client",
    })
  }

  const generic = r.shuffle(GENERIC_ITEMS)
  const count = base(file.status)
  for (let i = 0; i < count; i++) {
    const g = generic[i]!
    let status: PendingItem["status"]
    if (file.status === "depose" || file.status === "valide") status = "resolu"
    else if (file.status === "en_revue") status = i === 0 ? "ouvert" : "resolu"
    else if (file.status === "non_demarre") status = "ouvert"
    else status = r.pick(["ouvert", "ouvert", "relance", "resolu"] as const)
    items.push({
      id: `${d.id}-p-${i}`,
      annualFileId: file.id,
      kind: g.kind,
      cycle: g.cycle,
      label: g.label,
      status,
      createdAt: addDays(file.exercise.end, r.int(10, 80)),
      createdBy: r.chance(0.7) ? d.team.collaborateur : d.team.chefMission,
      assignee: g.kind === "technique" ? d.team.collaborateur : "client",
    })
  }
  return items
}

const pendingCache = new Map<string, PendingItem[]>()

export function getPendingItems(fileId: string): PendingItem[] {
  const cached = pendingCache.get(fileId)
  if (cached) return cached
  const file = byId.get(fileId)
  const d = file ? getDossier(file.dossierId) : undefined
  const items = file && d ? buildPendingItems(file, d) : []
  pendingCache.set(fileId, items)
  return items
}

/** Comptes significatifs d'un cycle (pour l'onglet Cycles) */
export function cycleAmount(d: Dossier, cycleCode: string) {
  const { lines } = getFinancials(d)
  const prefixes: Record<string, string[]> = {
    A: ["512", "53", "519"],
    B: ["401", "408"],
    C: ["411", "416", "418"],
    D: ["3"],
    E: ["20", "21"],
    F: ["421", "428", "43"],
    G: ["44"],
    H: ["10", "11"],
    I: ["15"],
    J: ["16"],
    K: ["455", "467", "471", "486", "487"],
  }
  const p = prefixes[cycleCode]
  if (!p) return null
  return { n: sumAccounts(lines, p, "n"), n1: sumAccounts(lines, p, "n1") }
}
