import { getAnnualFile } from "./annual-files"
import { getDossier } from "./dossiers"
import { createRng } from "./rng"
import type { Dossier, GedNode, GedSource } from "./types"
import { userName } from "./users"

/**
 * Arborescence documentaire d'un dossier, sur deux sources :
 * - la GED Pennylane (justificatifs comptables) ;
 * - SharePoint (dossier permanent et dossiers de travail du cabinet).
 * En production : MCP Pennylane (`list_firm_file`, factures) et Microsoft Graph.
 */

const SUPPLIERS = [
  "Elec Distribution Sud",
  "Télécom Pro Services",
  "Mutuelle Assurances du Midi",
  "Bureau & Papeterie Plus",
  "Garage du Lauragais",
  "Nettoyage Express",
  "Logiciels Gestion PME",
  "Transports Rapides 31",
  "Énergies du Tarn",
  "Fournitures Pro Occitanie",
]

const CUSTOMERS = [
  "SARL Dupré Bâtiment",
  "Clinique des Roses",
  "SAS Horizon Conseil",
  "Mairie de Saint-Sulpice",
  "SAS Méridienne",
  "SCI du Parc",
  "EURL Atelier Sud",
]

function monthFolderName(year: number, month: number) {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  )
  return `${year}-${String(month).padStart(2, "0")} — ${label}`
}

function isoAt(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, Math.min(day, 28), 9, 30)).toISOString()
}

function buildPennylane(d: Dossier): GedNode {
  const r = createRng(`ged-pl:${d.id}`)
  let id = 0
  const nid = () => `${d.id}-pl-${id++}`
  const months: [number, number][] = [
    [2026, 9],
    [2026, 8],
    [2026, 7],
  ]
  const invoices = (kind: "fournisseur" | "client"): GedNode[] =>
    months.map(([y, m]) => ({
      id: nid(),
      name: monthFolderName(y, m),
      kind: "folder" as const,
      source: "pennylane" as const,
      modifiedAt: isoAt(y, m, 28),
      modifiedBy: "Synchronisation Pennylane",
      children: Array.from({ length: r.int(4, 11) }, () => {
        const day = r.int(1, 28)
        const partner = kind === "fournisseur" ? r.pick(SUPPLIERS) : r.pick(CUSTOMERS)
        const num = kind === "fournisseur" ? `F${r.int(10_000, 99_999)}` : `${y}-${String(r.int(100, 999))}`
        return {
          id: nid(),
          name: `Facture ${partner} n° ${num}.pdf`,
          kind: "file" as const,
          source: "pennylane" as const,
          ext: "pdf" as const,
          sizeKb: r.int(48, 420),
          modifiedAt: isoAt(y, m, day),
          modifiedBy: kind === "fournisseur" ? "Client (dépôt mobile)" : "Pennylane — facturation",
        }
      }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
    }))

  return {
    id: `${d.id}-pl-root`,
    name: "GED Pennylane",
    kind: "folder",
    source: "pennylane",
    modifiedAt: isoAt(2026, 10, 5),
    modifiedBy: "Synchronisation Pennylane",
    children: [
      {
        id: nid(),
        name: "Factures fournisseurs",
        kind: "folder",
        source: "pennylane",
        modifiedAt: isoAt(2026, 10, 3),
        modifiedBy: "Synchronisation Pennylane",
        children: invoices("fournisseur"),
      },
      {
        id: nid(),
        name: "Factures clients",
        kind: "folder",
        source: "pennylane",
        modifiedAt: isoAt(2026, 10, 2),
        modifiedBy: "Synchronisation Pennylane",
        children: invoices("client"),
      },
      {
        id: nid(),
        name: "Relevés bancaires",
        kind: "folder",
        source: "pennylane",
        modifiedAt: isoAt(2026, 10, 2),
        modifiedBy: "Synchronisation Pennylane",
        children: Array.from({ length: 6 }, (_, i) => {
          const date = new Date(Date.UTC(2026, 8 - i, 1))
          const y = date.getUTCFullYear()
          const m = date.getUTCMonth() + 1
          return {
            id: nid(),
            name: `Relevé de compte — ${monthFolderName(y, m).split(" — ")[1]} ${y}.pdf`,
            kind: "file" as const,
            source: "pennylane" as const,
            ext: "pdf" as const,
            sizeKb: r.int(90, 380),
            modifiedAt: isoAt(y, m + 1 > 12 ? 1 : m + 1, 2),
            modifiedBy: "Synchronisation bancaire",
          }
        }),
      },
      {
        id: nid(),
        name: "Notes de frais",
        kind: "folder",
        source: "pennylane",
        modifiedAt: isoAt(2026, 9, 29),
        modifiedBy: "Client (dépôt mobile)",
        children: Array.from({ length: r.int(3, 7) }, () => {
          const m = r.int(7, 9)
          return {
            id: nid(),
            name: `${r.pick(["Ticket restaurant", "Péage autoroute", "Billet de train", "Parking", "Carburant"])} ${String(r.int(1, 28)).padStart(2, "0")}-${String(m).padStart(2, "0")}.jpg`,
            kind: "file" as const,
            source: "pennylane" as const,
            ext: "jpg" as const,
            sizeKb: r.int(180, 1_900),
            modifiedAt: isoAt(2026, m, r.int(1, 28)),
            modifiedBy: "Client (dépôt mobile)",
          }
        }),
      },
      {
        id: nid(),
        name: "Autres documents",
        kind: "folder",
        source: "pennylane",
        modifiedAt: isoAt(2026, 9, 12),
        modifiedBy: "Synchronisation Pennylane",
        children: [
          { id: nid(), name: "Attestation de vigilance URSSAF.pdf", kind: "file", source: "pennylane", ext: "pdf", sizeKb: 96, modifiedAt: isoAt(2026, 9, 12), modifiedBy: "Client" },
          { id: nid(), name: "Avis d'impôt CFE 2025.pdf", kind: "file", source: "pennylane", ext: "pdf", sizeKb: 142, modifiedAt: isoAt(2025, 11, 20), modifiedBy: "Client" },
          { id: nid(), name: "Contrat d'assurance multirisque.pdf", kind: "file", source: "pennylane", ext: "pdf", sizeKb: 812, modifiedAt: isoAt(2026, 2, 3), modifiedBy: "Client" },
        ],
      },
    ],
  }
}

function buildSharepoint(d: Dossier): GedNode {
  const r = createRng(`ged-sp:${d.id}`)
  const file = getAnnualFile(d.id)!
  let id = 0
  const nid = () => `${d.id}-sp-${id++}`
  const endYear = new Date(file.exercise.end).getUTCFullYear()
  const exLabel = file.exercise.label.replace("Exercice ", "")
  const prevLabel = file.previousExercise.label.replace("Exercice ", "")
  const team = [d.team.collaborateur, d.team.chefMission, d.team.associe]
  const by = () => userName(r.pick(team))
  const f = (name: string, ext: GedNode["ext"], y: number, m: number, modifiedBy = by()): GedNode => ({
    id: nid(),
    name,
    kind: "file",
    source: "sharepoint",
    ext,
    sizeKb: ext === "xlsx" ? r.int(40, 900) : ext === "txt" ? r.int(800, 9_000) : r.int(60, 2_400),
    modifiedAt: isoAt(y, m, r.int(1, 28)),
    modifiedBy,
  })
  const folder = (name: string, children: GedNode[]): GedNode => ({
    id: nid(),
    name,
    kind: "folder",
    source: "sharepoint",
    modifiedAt: children.reduce((max, c) => (c.modifiedAt > max ? c.modifiedAt : max), "2020-01-01"),
    modifiedBy: children[0]?.modifiedBy ?? "—",
    children,
  })
  const exEnd = new Date(file.exercise.end)
  const em = exEnd.getUTCMonth() + 1
  const closingStamp = `${exEnd.getUTCFullYear()}${String(em).padStart(2, "0")}${String(exEnd.getUTCDate()).padStart(2, "0")}`
  const advanced = file.status !== "non_demarre"
  const done = file.status === "depose" || file.status === "valide"
  const workMonth = em === 12 ? 2 : Math.min(12, em + 2)
  const workYear = em === 12 ? endYear + 1 : endYear

  const currentExercise = [
    advanced && f(`Balance générale au ${exEnd.toLocaleDateString("fr-FR", { timeZone: "UTC" }).replaceAll("/", "-")}.xlsx`, "xlsx", workYear, workMonth),
    advanced && f(`FEC_${d.siren}_${closingStamp}.txt`, "txt", workYear, workMonth, "Synchronisation Pennylane"),
    advanced && f("Rapprochements bancaires.xlsx", "xlsx", workYear, workMonth),
    advanced && d.sector !== "services" && f("Inventaire des stocks valorisé.xlsx", "xlsx", workYear, workMonth, "Client"),
    advanced && f("Tableau des immobilisations.xlsx", "xlsx", workYear, workMonth),
    done && f(`Liasse fiscale ${exLabel}.pdf`, "pdf", workYear, Math.min(12, workMonth + 2)),
    done && f(`Comptes annuels ${exLabel}.pdf`, "pdf", workYear, Math.min(12, workMonth + 2)),
    done && f(`Lettre d'affirmation ${exLabel}.docx`, "docx", workYear, Math.min(12, workMonth + 2)),
    (advanced || done) && f(`Note de synthèse ${exLabel}.docx`, "docx", workYear, Math.min(12, workMonth + 1)),
    f(`Demande de pièces de clôture ${exLabel}.docx`, "docx", em === 12 ? endYear + 1 : endYear, em === 12 ? 1 : Math.min(12, em + 1)),
  ].filter(Boolean) as GedNode[]

  return {
    id: `${d.id}-sp-root`,
    name: "SharePoint",
    kind: "folder",
    source: "sharepoint",
    modifiedAt: isoAt(2026, 10, 2),
    modifiedBy: by(),
    children: [
      folder("01 — Dossier permanent", [
        folder("Juridique", [
          f("Statuts à jour.pdf", "pdf", 2024, r.int(1, 12), "Client"),
          f("Extrait Kbis — septembre 2026.pdf", "pdf", 2026, 9, by()),
          f(`PV d'AG d'approbation des comptes ${prevLabel}.pdf`, "pdf", 2025, r.int(5, 6), "Client"),
          f("Registre des bénéficiaires effectifs.pdf", "pdf", 2023, r.int(1, 12), by()),
        ]),
        folder("Contrats", [
          f("Bail commercial.pdf", "pdf", 2022, r.int(1, 12), "Client"),
          f("Contrat de prêt bancaire.pdf", "pdf", 2024, r.int(1, 12), "Client"),
          f("Contrat de crédit-bail véhicule.pdf", "pdf", 2025, r.int(1, 12), "Client"),
        ]),
        f("Lettre de mission signée.pdf", "pdf", 2025, r.int(1, 3), userName(d.team.associe)),
        f("Fiche d'identification client (LCB-FT).docx", "docx", 2025, r.int(1, 3), userName(d.team.chefMission)),
      ]),
      folder(`02 — ${file.exercise.label}`, currentExercise),
      folder(`03 — ${file.previousExercise.label}`, [
        f(`Liasse fiscale ${prevLabel}.pdf`, "pdf", endYear, 4),
        f(`Comptes annuels ${prevLabel}.pdf`, "pdf", endYear, 4),
        f(`Note de synthèse ${prevLabel}.docx`, "docx", endYear, 4),
        f(`FEC_${d.siren}_${closingStamp.replace(String(endYear), String(endYear - 1))}.txt`, "txt", endYear, 3, "Synchronisation Pennylane"),
      ]),
      folder("04 — Correspondance", [
        f("Échanges client — questions de clôture.msg", "msg", 2026, r.int(2, 9)),
        f("Relance pièces manquantes.msg", "msg", 2026, r.int(3, 9)),
      ]),
    ],
  }
}

const cache = new Map<string, Record<GedSource, GedNode>>()

export function getGed(dossierId: string) {
  const cached = cache.get(dossierId)
  if (cached) return cached
  const d = getDossier(dossierId)
  if (!d) return null
  const tree = { pennylane: buildPennylane(d), sharepoint: buildSharepoint(d) }
  cache.set(dossierId, tree)
  return tree
}

export function findNode(root: GedNode, id: string): GedNode | null {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const found = findNode(c, id)
    if (found) return found
  }
  return null
}

export function pathTo(root: GedNode, id: string): GedNode[] {
  if (root.id === id) return [root]
  for (const c of root.children ?? []) {
    const p = pathTo(c, id)
    if (p.length) return [root, ...p]
  }
  return []
}

export function flattenFiles(root: GedNode): GedNode[] {
  if (root.kind === "file") return [root]
  return (root.children ?? []).flatMap(flattenFiles)
}
