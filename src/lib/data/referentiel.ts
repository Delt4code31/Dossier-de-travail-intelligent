import type {
  AnnualStatus,
  CycleDef,
  CycleStatus,
  FiscalDocStatus,
  FiscalDocType,
  MissionType,
  PendingStatus,
  Sector,
  TaxRegime,
  VatRegime,
} from "./types"

export const MISSIONS: Record<MissionType, string> = {
  presentation: "Présentation des comptes",
  tenue_presentation: "Tenue & présentation",
  examen_limite: "Examen limité",
  audit_contractuel: "Audit contractuel",
}

export const TAX_REGIMES: Record<TaxRegime, string> = {
  IS_RN: "IS — Régime réel normal",
  IS_RSI: "IS — Régime simplifié",
  IR_BIC_RSI: "IR — BIC régime simplifié",
  IR_RF: "IR — Revenus fonciers",
}

export const VAT_REGIMES: Record<VatRegime, string> = {
  RN_mensuel: "Réel normal — mensuel (CA3)",
  RN_trimestriel: "Réel normal — trimestriel (CA3)",
  RSI: "Réel simplifié (CA12)",
  exonere: "Exonéré",
}

export const SECTORS: Record<Sector, string> = {
  services: "Services",
  commerce: "Commerce",
  btp: "BTP",
  restauration: "Hôtellerie-restauration",
  industrie: "Industrie & artisanat",
  transport: "Transport",
  sante: "Santé",
  immobilier: "Immobilier",
}

export const ANNUAL_STATUS: Record<
  AnnualStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "done" }
> = {
  non_demarre: { label: "Non démarré", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  en_revue: { label: "En revue", tone: "warning" },
  valide: { label: "Validé", tone: "success" },
  depose: { label: "Déposé", tone: "done" },
}

export const CYCLE_STATUS: Record<CycleStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Préparé",
  revu: "Revu",
}

export const PENDING_STATUS: Record<PendingStatus, string> = {
  ouvert: "Ouvert",
  relance: "Relancé",
  resolu: "Résolu",
}

export const FISCAL_DOC_TYPES: Record<FiscalDocType, string> = {
  liasse: "Liasse fiscale",
  tva: "TVA",
  is_acompte: "Acompte d'IS",
  is_solde: "Solde d'IS",
  cvae: "CVAE",
  das2: "DAS2",
}

export const FISCAL_DOC_STATUS: Record<FiscalDocStatus, string> = {
  depose: "Déposé",
  a_deposer: "À déposer",
  brouillon: "En préparation",
  en_retard: "En retard",
}

/**
 * Cycles de révision et programme de contrôles (référentiel cabinet).
 * Lettres A → K selon l'usage du dossier de travail.
 */
export const CYCLES: CycleDef[] = [
  {
    code: "A",
    name: "Trésorerie",
    accounts: "Classe 5",
    controls: [
      { id: "A1", label: "Rapprochements bancaires au jour de clôture obtenus et contrôlés" },
      { id: "A2", label: "Soldes bancaires rapprochés des relevés / attestations" },
      { id: "A3", label: "Caisse : absence de solde créditeur en cours d'exercice" },
      { id: "A4", label: "Virements internes (580) soldés" },
    ],
  },
  {
    code: "B",
    name: "Achats & fournisseurs",
    accounts: "401, 408, 409 — 60, 61, 62",
    controls: [
      { id: "B1", label: "Balance âgée fournisseurs revue, soldes anciens justifiés" },
      { id: "B2", label: "Fournisseurs débiteurs analysés" },
      { id: "B3", label: "Factures non parvenues (408) estimées" },
      { id: "B4", label: "Séparation des exercices (cut-off) des achats" },
      { id: "B5", label: "Revue analytique des charges externes" },
    ],
  },
  {
    code: "C",
    name: "Ventes & clients",
    accounts: "411, 416, 418, 419 — 70",
    controls: [
      { id: "C1", label: "Balance âgée clients revue, créances douteuses identifiées" },
      { id: "C2", label: "Clients créditeurs analysés" },
      { id: "C3", label: "Dépréciation des créances (491) justifiée" },
      { id: "C4", label: "Factures à établir (418) et avoirs à émettre" },
      { id: "C5", label: "Rapprochement CA comptable / CA déclaré en TVA" },
    ],
  },
  {
    code: "D",
    name: "Stocks & en-cours",
    accounts: "31 à 37 — 603, 713",
    controls: [
      { id: "D1", label: "Inventaire physique à la clôture obtenu" },
      { id: "D2", label: "Valorisation des stocks contrôlée (coût d'achat / CUMP)" },
      { id: "D3", label: "Dépréciation des stocks à rotation lente" },
      { id: "D4", label: "Variation de stock comptabilisée" },
    ],
  },
  {
    code: "E",
    name: "Immobilisations",
    accounts: "20, 21, 23, 27 — 28, 681",
    controls: [
      { id: "E1", label: "Tableau des immobilisations rapproché de la balance" },
      { id: "E2", label: "Acquisitions de l'exercice justifiées (factures)" },
      { id: "E3", label: "Cessions et mises au rebut comptabilisées" },
      { id: "E4", label: "Dotations aux amortissements recalculées" },
      { id: "E5", label: "Petits matériels > 500 € HT en charges analysés" },
    ],
  },
  {
    code: "F",
    name: "Personnel & organismes sociaux",
    accounts: "421, 428, 43 — 64",
    controls: [
      { id: "F1", label: "Rapprochement journal de paie / DSN / comptabilité" },
      { id: "F2", label: "Charges sociales rapprochées des déclarations" },
      { id: "F3", label: "Provision pour congés payés et charges associées" },
      { id: "F4", label: "Primes et rémunérations variables à payer" },
    ],
  },
  {
    code: "G",
    name: "État, impôts & taxes",
    accounts: "44 — 63, 695",
    controls: [
      { id: "G1", label: "TVA : rapprochement déclarations / comptabilité" },
      { id: "G2", label: "IS : calcul de l'impôt et des acomptes" },
      { id: "G3", label: "CFE / CVAE et taxes diverses" },
      { id: "G4", label: "Réintégrations fiscales identifiées (amendes, TVS…)" },
    ],
  },
  {
    code: "H",
    name: "Capitaux propres",
    accounts: "10 à 14",
    controls: [
      { id: "H1", label: "Affectation du résultat N-1 conforme au PV d'AG" },
      { id: "H2", label: "Capital social conforme aux statuts / Kbis" },
      { id: "H3", label: "Réserve légale dotée" },
      { id: "H4", label: "Capitaux propres ≥ moitié du capital social" },
    ],
  },
  {
    code: "I",
    name: "Provisions pour risques",
    accounts: "15",
    controls: [
      { id: "I1", label: "Revue des litiges et risques en cours" },
      { id: "I2", label: "Provisions justifiées et évaluées" },
      { id: "I3", label: "Engagements de retraite (annexe)" },
    ],
  },
  {
    code: "J",
    name: "Emprunts & dettes financières",
    accounts: "16, 519 — 66",
    controls: [
      { id: "J1", label: "Tableaux d'amortissement rapprochés des soldes" },
      { id: "J2", label: "Intérêts courus comptabilisés" },
      { id: "J3", label: "Ventilation à moins / plus d'un an" },
    ],
  },
  {
    code: "K",
    name: "Autres créances & dettes",
    accounts: "45, 46, 47, 48",
    controls: [
      { id: "K1", label: "Comptes d'attente (471-472) soldés" },
      { id: "K2", label: "Comptes courants d'associés : pas de solde débiteur" },
      { id: "K3", label: "Charges et produits constatés d'avance" },
      { id: "K4", label: "Charges à payer / produits à recevoir" },
    ],
  },
]

export const CONTROL_COUNT = CYCLES.reduce((sum, c) => sum + c.controls.length, 0)

export function getCycle(code: string) {
  return CYCLES.find((c) => c.code === code)
}
