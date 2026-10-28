import { ANNUAL_FILES } from "./annual-files"
import { getChecks } from "./checks"
import { getDossier } from "./dossiers"
import { CYCLES } from "./referentiel"
import { createRng } from "./rng"
import type { ActivityEvent, AppNotification, Task } from "./types"
import { CURRENT_USER_ID } from "./users"

function minutesAgo(minutes: number) {
  return new Date(Date.parse("2026-10-05T09:30:00+02:00") - minutes * 60_000).toISOString()
}

function minutesFromNow(minutes: number) {
  return new Date(Date.parse("2026-10-05T09:30:00+02:00") + minutes * 60_000).toISOString()
}

/** Journal d'activité récent (production, analyses, synchronisations) */
function buildActivity(): ActivityEvent[] {
  const r = createRng("activity")
  const events: ActivityEvent[] = []
  let id = 0
  const active = ANNUAL_FILES.filter((f) => ["en_cours", "en_revue", "valide"].includes(f.status))
  for (const file of active) {
    const d = getDossier(file.dossierId)!
    const n = file.status === "en_cours" ? r.int(3, 6) : r.int(2, 4)
    for (let i = 0; i < n; i++) {
      const cycle = r.pick(CYCLES)
      const templates =
        file.status === "en_cours"
          ? [
              { user: d.team.collaborateur, text: `a coché ${r.int(2, 5)} contrôles du cycle ${cycle.name}` },
              { user: d.team.collaborateur, text: `a ajouté un point en suspens (cycle ${cycle.name})` },
              { user: d.team.collaborateur, text: "a lancé l'analyse automatique du dossier" },
              { user: d.team.chefMission, text: `a commenté le cycle ${cycle.name}` },
            ]
          : [
              { user: d.team.chefMission, text: `a revu le cycle ${cycle.name}` },
              { user: d.team.associe, text: "a consulté la note de synthèse" },
              { user: d.team.chefMission, text: "a résolu un point en suspens" },
            ]
      const t = r.pick(templates)
      events.push({
        id: `act-${id++}`,
        at: minutesAgo(r.int(10, 60 * 24 * 6)),
        userId: t.user,
        dossierId: d.id,
        text: t.text,
      })
    }
    if (file.status === "valide") {
      events.push({ id: `act-${id++}`, at: minutesAgo(60 * 26), userId: d.team.associe, dossierId: d.id, text: "a validé le dossier annuel" })
    }
  }
  events.push({ id: `act-${id++}`, at: minutesAgo(17), userId: "system", dossierId: null, text: "Synchronisation Pennylane terminée — 29 dossiers à jour, 1 en erreur" })
  events.push({ id: `act-${id++}`, at: minutesAgo(60 * 3 + 12), userId: "system", dossierId: null, text: "Documents fiscaux récupérés depuis Pennylane — 14 nouveaux documents" })
  return events.sort((a, b) => b.at.localeCompare(a.at))
}

let activity: ActivityEvent[] | null = null

export function getActivity() {
  if (!activity) activity = buildActivity()
  return activity
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    at: minutesAgo(17),
    kind: "sync",
    title: "Synchronisation Pennylane terminée",
    description: "29 dossiers à jour — SARL TRANSPORTS MOREAU-DELAGE en erreur (jeton expiré).",
    href: "/admin",
  },
  {
    id: "n2",
    at: minutesAgo(52),
    kind: "echeance",
    title: "Échéance liasse dans 10 jours",
    description: "SAS MAISON PRALINE — avancement 41 %, dépôt attendu le 15/10/2026.",
    href: "/production/dossiers-annuels/maison-praline",
  },
  {
    id: "n3",
    at: minutesAgo(60 * 2 + 5),
    kind: "validation",
    title: "Dossier prêt pour votre validation",
    description: "SAS ORBITAL DATA LAB — tous les cycles sont préparés, revue en cours.",
    href: "/production/dossiers-annuels/orbital-data-lab",
  },
  {
    id: "n4",
    at: minutesAgo(60 * 3 + 12),
    kind: "document",
    title: "14 nouveaux documents fiscaux",
    description: "Déclarations de TVA d'août et acomptes d'IS de septembre récupérés depuis Pennylane.",
    href: "/documents",
  },
  {
    id: "n5",
    at: minutesAgo(60 * 20),
    kind: "alerte",
    title: "Anomalie détectée par l'analyse",
    description: "SARL CAVE & COMPTOIR DES VIGNES — compte courant d'associé débiteur (3 840 €).",
    href: "/analyse/cave-comptoir/controles",
  },
  {
    id: "n6",
    at: minutesAgo(60 * 26),
    kind: "validation",
    title: "Dossier validé",
    description: "SAS PIXEL & PAPIER — validé par Sophie Lambert, liasse prête à être déposée.",
    href: "/production/dossiers-annuels/pixel-papier",
  },
]

/** Tâches de l'utilisateur connecté (Yann, expert-comptable associé du pôle TPE) */
export function getTasks(): Task[] {
  const tasks: Task[] = [
    {
      id: "t1",
      userId: CURRENT_USER_ID,
      dossierId: "maison-praline",
      label: "Faire le point avec Hugo sur le retard (échéance 15/10)",
      due: minutesFromNow(60 * 6),
      href: "/production/dossiers-annuels/maison-praline",
    },
    {
      id: "t2",
      userId: CURRENT_USER_ID,
      dossierId: "ceramique-odile",
      label: "Relancer la cliente pour les pièces manquantes",
      due: minutesFromNow(60 * 24),
      href: "/production/dossiers-annuels/ceramique-odile/points-en-suspens",
    },
    {
      id: "t3",
      userId: CURRENT_USER_ID,
      dossierId: "cave-comptoir",
      label: "Traiter le compte courant d'associé débiteur",
      due: minutesFromNow(60 * 24 * 2),
      href: "/analyse/cave-comptoir/controles",
    },
    {
      id: "t4",
      userId: CURRENT_USER_ID,
      dossierId: "vertigo-escalade",
      label: "Valider le budget d'heures de la mission",
      due: minutesFromNow(60 * 24 * 3),
      href: "/production/parametrage/vertigo-escalade",
    },
    {
      id: "t5",
      userId: CURRENT_USER_ID,
      dossierId: "salon-epure",
      label: "Compléter les seuils de signification",
      due: minutesFromNow(60 * 24 * 4),
      href: "/production/parametrage/salon-epure",
    },
  ]
  return tasks
}

/** Alertes d'analyse les plus importantes sur le portefeuille */
export function getTopAlerts(dossierIds: string[], limit = 6) {
  const alerts = dossierIds.flatMap((id) => {
    const d = getDossier(id)!
    return getChecks(d)
      .filter((c) => c.status === "anomalie")
      .map((c) => ({ dossier: d, check: c }))
  })
  return alerts
    .sort((a, b) => Math.abs(b.check.amount ?? 0) - Math.abs(a.check.amount ?? 0))
    .slice(0, limit)
}
