/**
 * Modèle de données de l'application.
 *
 * En démo, ces objets sont générés (données fictives). En production, ils seront
 * alimentés par l'API / le MCP Pennylane et par Microsoft Graph (SharePoint).
 * Voir src/lib/integrations/.
 */

export type RoleId = "admin" | "expert_comptable" | "chef_mission" | "collaborateur"

export type TeamId = "pme" | "tpe"

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: RoleId
  title: string
  team: TeamId
  status: "actif" | "invite"
  lastLoginAt: string | null
}

export type LegalForm = "SAS" | "SASU" | "SARL" | "EURL" | "SCI" | "SELARL"

export type Sector =
  | "services"
  | "commerce"
  | "btp"
  | "restauration"
  | "industrie"
  | "transport"
  | "sante"
  | "immobilier"

export type MissionType =
  | "presentation"
  | "tenue_presentation"
  | "examen_limite"
  | "audit_contractuel"

export type TaxRegime = "IS_RN" | "IS_RSI" | "IR_BIC_RSI" | "IR_RF"

export type VatRegime = "RN_mensuel" | "RN_trimestriel" | "RSI" | "exonere"

export type ConnectionStatus = "connecte" | "erreur" | "non_connecte"

export interface Thresholds {
  /** Seuil de signification (€) */
  signification: number
  /** Seuil de planification (€) */
  planification: number
  /** Seuil des anomalies manifestement insignifiantes (€) */
  insignifiant: number
  /** Revue analytique : variation significative à partir de … % */
  variationPct: number
  /** … et de … € */
  variationAmount: number
}

export interface Dossier {
  id: string
  name: string
  legalForm: LegalForm
  siren: string
  sector: Sector
  naf: { code: string; label: string }
  address: { street: string; zip: string; city: string }
  director: string
  /** Mois et jour de clôture, ex. "12-31" */
  closing: string
  mission: MissionType
  taxRegime: TaxRegime
  vatRegime: VatRegime
  liasse: "2050" | "2033" | "2031" | "2072"
  capital: number
  employees: number
  /** Chiffre d'affaires du dernier exercice clos (pilote la génération) */
  revenue: number
  growth: number
  team: { collaborateur: string; chefMission: string; associe: string }
  thresholds: Thresholds | null
  pennylane: { companyId: number; status: ConnectionStatus; lastSyncAt: string; error?: string }
  sharepoint: { status: ConnectionStatus; path: string | null; lastSyncAt: string | null }
  fiscalDocsSyncAt: string
  engagementLetterSigned: boolean
}

/* ---------- Balance & analyse ---------- */

export interface BalanceLine {
  account: string
  label: string
  /** Regroupement de revue analytique (voir balance.ts → GROUPS) */
  group: string
  /** Solde N (positif = débiteur, négatif = créditeur) */
  n: number
  /** Solde N-1 */
  n1: number
}

export interface Exercise {
  start: string
  end: string
  label: string
}

export type CheckStatus = "ok" | "attention" | "anomalie" | "na"

export interface CheckDetail {
  account?: string
  label: string
  amount?: number
  date?: string
  note?: string
}

export interface AutoCheck {
  id: string
  label: string
  cycle: string
  description: string
  status: CheckStatus
  summary: string
  amount?: number
  count?: number
  details: CheckDetail[]
  /** Outil MCP Pennylane qui alimentera le contrôle en production */
  source: string
}

/* ---------- Production ---------- */

export type AnnualStatus = "non_demarre" | "en_cours" | "en_revue" | "valide" | "depose"

export type ControlState = "todo" | "done" | "na"

export type CycleStatus = "a_faire" | "en_cours" | "fait" | "revu"

export interface ControlDef {
  id: string
  label: string
}

export interface CycleDef {
  code: string
  name: string
  accounts: string
  controls: ControlDef[]
}

export interface CycleProgress {
  code: string
  controls: Record<string, ControlState>
  preparedBy: string | null
  preparedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  comment: string
}

export type PendingStatus = "ouvert" | "relance" | "resolu"

export interface PendingItem {
  id: string
  annualFileId: string
  kind: "question" | "document" | "technique"
  cycle: string | null
  label: string
  status: PendingStatus
  createdAt: string
  createdBy: string
  assignee: "client" | string
}

export interface AnnualFile {
  id: string
  dossierId: string
  exercise: Exercise
  previousExercise: Exercise
  status: AnnualStatus
  dueDate: string
  agDeadline: string
  filedAt: string | null
  cycles: CycleProgress[]
  lastActivityAt: string
}

/* ---------- Documents ---------- */

export type FiscalDocType = "liasse" | "tva" | "is_acompte" | "is_solde" | "cvae" | "das2"

export type FiscalDocStatus = "depose" | "a_deposer" | "brouillon" | "en_retard"

export interface FiscalDocument {
  id: string
  dossierId: string
  type: FiscalDocType
  form: string
  label: string
  period: string
  dueDate: string
  filedAt: string | null
  status: FiscalDocStatus
  amount: number | null
  sizeKb: number
}

export type GedSource = "pennylane" | "sharepoint"

export interface GedNode {
  id: string
  name: string
  kind: "folder" | "file"
  source: GedSource
  ext?: "pdf" | "xlsx" | "docx" | "txt" | "jpg" | "msg"
  sizeKb?: number
  modifiedAt: string
  modifiedBy: string
  children?: GedNode[]
}

/* ---------- Vie de l'application ---------- */

export interface ActivityEvent {
  id: string
  at: string
  userId: string
  dossierId: string | null
  text: string
}

export interface AppNotification {
  id: string
  at: string
  kind: "sync" | "validation" | "echeance" | "document" | "alerte"
  title: string
  description: string
  href: string
}

export interface Task {
  id: string
  userId: string
  dossierId: string
  label: string
  due: string
  href: string
}
