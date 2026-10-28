import type { AnnualStatus } from "./types"

/**
 * Scénario de la démo au 05/10/2026 : statut de production du dernier exercice clos.
 * Les clôtures au 31/12/2025 sont presque toutes déposées ; les clôtures au 30/06/2026
 * sont en pleine production (échéance de la liasse le 15/10/2026).
 * Tout dossier absent de cette liste est « déposé ».
 */
export const SCENARIO: Record<string, { status: AnnualStatus; progress: number }> = {
  "pharmacie-arcades": { status: "non_demarre", progress: 0 },
  "cycles-randonnees": { status: "non_demarre", progress: 0 },
  "bati-renov": { status: "en_cours", progress: 0.68 },
  "maison-praline": { status: "en_cours", progress: 0.41 },
  "comptoir-vergers": { status: "en_cours", progress: 0.33 },
  "vertigo-escalade": { status: "en_cours", progress: 0.14 },
  "transports-moreau": { status: "en_cours", progress: 0.56 },
  "ceramique-odile": { status: "en_cours", progress: 0.27 },
  "opaline-logistique": { status: "en_revue", progress: 1 },
  "orbital-data-lab": { status: "en_revue", progress: 1 },
  "pixel-papier": { status: "valide", progress: 1 },
}

export function scenarioFor(dossierId: string) {
  return SCENARIO[dossierId] ?? { status: "depose" as const, progress: 1 }
}

/** Dossier dont la révision est terminée : les anomalies courantes ont été corrigées. */
export function isFinalized(dossierId: string) {
  const { status } = scenarioFor(dossierId)
  return status === "depose" || status === "valide"
}
