import { exerciseMonths, lastClosedExercises } from "./exercises"
import { createRng, type Rng } from "./rng"
import { isFinalized } from "./scenario"
import type { BalanceLine, Dossier } from "./types"

/**
 * Génération d'une balance générale N / N-1 fictive mais cohérente :
 * - profil de charges par activité (commerce, services, BTP…) ;
 * - marge d'exploitation cible par dossier ;
 * - bilan équilibré (la banque sert de compte d'équilibrage) ;
 * - capitaux propres N = capitaux propres N-1 + résultat N-1 − distributions.
 *
 * En production, la balance vient de Pennylane (outil MCP `query_trial_balance`).
 */

/* -------------------------------------------------------------------------- */
/* Regroupements de revue analytique                                           */
/* -------------------------------------------------------------------------- */

export type GroupSection = "produits" | "charges" | "actif" | "passif"

export interface GroupDef {
  id: string
  label: string
  section: GroupSection
  /** +1 : on affiche le solde débiteur ; −1 : on affiche le solde créditeur */
  sign: 1 | -1
}

export const GROUPS: GroupDef[] = [
  { id: "ca", label: "Chiffre d'affaires", section: "produits", sign: -1 },
  { id: "autres_produits", label: "Autres produits d'exploitation", section: "produits", sign: -1 },
  { id: "produits_fin", label: "Produits financiers", section: "produits", sign: -1 },
  { id: "produits_exc", label: "Produits exceptionnels", section: "produits", sign: -1 },
  { id: "achats_march", label: "Achats de marchandises (variation incluse)", section: "charges", sign: 1 },
  { id: "achats_mp", label: "Achats de matières et approvisionnements", section: "charges", sign: 1 },
  { id: "charges_ext", label: "Autres achats et charges externes", section: "charges", sign: 1 },
  { id: "impots_taxes", label: "Impôts et taxes", section: "charges", sign: 1 },
  { id: "salaires", label: "Salaires et traitements", section: "charges", sign: 1 },
  { id: "charges_sociales", label: "Charges sociales", section: "charges", sign: 1 },
  { id: "dotations", label: "Dotations aux amortissements et dépréciations", section: "charges", sign: 1 },
  { id: "autres_charges", label: "Autres charges d'exploitation", section: "charges", sign: 1 },
  { id: "charges_fin", label: "Charges financières", section: "charges", sign: 1 },
  { id: "charges_exc", label: "Charges exceptionnelles", section: "charges", sign: 1 },
  { id: "is", label: "Impôt sur les bénéfices", section: "charges", sign: 1 },
  { id: "immo_incorp", label: "Immobilisations incorporelles nettes", section: "actif", sign: 1 },
  { id: "immo_corp", label: "Immobilisations corporelles nettes", section: "actif", sign: 1 },
  { id: "immo_fin", label: "Immobilisations financières", section: "actif", sign: 1 },
  { id: "stocks", label: "Stocks et en-cours", section: "actif", sign: 1 },
  { id: "clients", label: "Clients et comptes rattachés", section: "actif", sign: 1 },
  { id: "autres_creances", label: "Autres créances", section: "actif", sign: 1 },
  { id: "dispo", label: "Disponibilités", section: "actif", sign: 1 },
  { id: "capitaux_propres", label: "Capitaux propres (hors résultat)", section: "passif", sign: -1 },
  { id: "provisions", label: "Provisions pour risques et charges", section: "passif", sign: -1 },
  { id: "emprunts", label: "Emprunts et dettes financières", section: "passif", sign: -1 },
  { id: "fournisseurs", label: "Fournisseurs et comptes rattachés", section: "passif", sign: -1 },
  { id: "dettes_fisc_soc", label: "Dettes fiscales et sociales", section: "passif", sign: -1 },
  { id: "autres_dettes", label: "Autres dettes", section: "passif", sign: -1 },
]

function groupFor(account: string): string {
  const a = account
  const starts = (...prefixes: string[]) => prefixes.some((p) => a.startsWith(p))
  if (starts("70")) return "ca"
  if (starts("71", "72", "74", "75", "78", "79")) return "autres_produits"
  if (starts("76")) return "produits_fin"
  if (starts("77")) return "produits_exc"
  if (starts("607", "6037")) return "achats_march"
  if (starts("601", "602", "6031", "6032")) return "achats_mp"
  if (starts("604", "605", "606", "61", "62")) return "charges_ext"
  if (starts("63")) return "impots_taxes"
  if (starts("641", "644")) return "salaires"
  if (starts("645", "646", "647", "648")) return "charges_sociales"
  if (starts("681")) return "dotations"
  if (starts("65")) return "autres_charges"
  if (starts("66")) return "charges_fin"
  if (starts("67")) return "charges_exc"
  if (starts("69")) return "is"
  if (starts("20", "280")) return "immo_incorp"
  if (starts("21", "23", "281")) return "immo_corp"
  if (starts("26", "27")) return "immo_fin"
  if (starts("3")) return "stocks"
  if (starts("411", "416", "418", "491")) return "clients"
  if (starts("409", "4456", "486", "467", "471", "580")) return "autres_creances"
  if (starts("512", "53")) return "dispo"
  if (starts("10", "11", "12")) return "capitaux_propres"
  if (starts("15")) return "provisions"
  if (starts("16", "519")) return "emprunts"
  if (starts("401", "408")) return "fournisseurs"
  if (starts("42", "43", "44")) return "dettes_fisc_soc"
  return "autres_dettes"
}

/* -------------------------------------------------------------------------- */
/* Plan de comptes                                                             */
/* -------------------------------------------------------------------------- */

const LABELS: Record<string, string> = {
  "101300": "Capital souscrit, appelé, versé",
  "106100": "Réserve légale",
  "106800": "Autres réserves",
  "110000": "Report à nouveau (créditeur)",
  "119000": "Report à nouveau (débiteur)",
  "151100": "Provisions pour litiges",
  "164000": "Emprunts auprès des établissements de crédit",
  "205000": "Concessions, brevets, logiciels",
  "207000": "Fonds commercial",
  "211000": "Terrains",
  "213000": "Constructions",
  "215400": "Matériel industriel",
  "218100": "Installations générales, agencements",
  "218200": "Matériel de transport",
  "218300": "Matériel de bureau et informatique",
  "218400": "Mobilier",
  "275000": "Dépôts et cautionnements versés",
  "280500": "Amort. concessions, logiciels",
  "281300": "Amort. constructions",
  "281540": "Amort. matériel industriel",
  "281810": "Amort. installations, agencements",
  "281820": "Amort. matériel de transport",
  "281830": "Amort. matériel de bureau et informatique",
  "281840": "Amort. mobilier",
  "310000": "Matières premières",
  "355000": "Produits finis",
  "370000": "Stocks de marchandises",
  "401000": "Fournisseurs",
  "408100": "Fournisseurs, factures non parvenues",
  "409100": "Fournisseurs, avances et acomptes versés",
  "411000": "Clients",
  "416000": "Clients douteux ou litigieux",
  "418100": "Clients, factures à établir",
  "419100": "Clients, avances et acomptes reçus",
  "421000": "Personnel, rémunérations dues",
  "428200": "Dettes provisionnées pour congés à payer",
  "431000": "Sécurité sociale",
  "437000": "Autres organismes sociaux",
  "438600": "Organismes sociaux, charges à payer",
  "444000": "État, impôt sur les bénéfices",
  "445510": "TVA à décaisser",
  "445660": "TVA déductible sur autres biens et services",
  "447000": "Autres impôts, taxes et versements assimilés",
  "455000": "Associés, comptes courants",
  "467000": "Autres comptes débiteurs ou créditeurs",
  "471000": "Compte d'attente",
  "486000": "Charges constatées d'avance",
  "487000": "Produits constatés d'avance",
  "491000": "Dépréciation des comptes clients",
  "512000": "Banque",
  "519100": "Concours bancaires courants",
  "530000": "Caisse",
  "601000": "Achats de matières premières",
  "603100": "Variation des stocks de matières premières",
  "603700": "Variation des stocks de marchandises",
  "604000": "Achats d'études et prestations de services",
  "606100": "Fournitures non stockables (eau, énergie, carburant)",
  "606300": "Fournitures d'entretien et petit équipement",
  "606400": "Fournitures administratives",
  "607000": "Achats de marchandises",
  "611000": "Sous-traitance générale",
  "613200": "Locations immobilières",
  "613500": "Locations mobilières",
  "615000": "Entretien et réparations",
  "616000": "Primes d'assurances",
  "622600": "Honoraires",
  "623000": "Publicité, publications, relations publiques",
  "624100": "Transports sur achats et ventes",
  "625100": "Voyages et déplacements",
  "626000": "Frais postaux et de télécommunications",
  "627000": "Services bancaires et assimilés",
  "628800": "Autres services extérieurs divers",
  "631100": "Taxe sur les salaires",
  "635110": "Contribution économique territoriale",
  "635120": "Taxes foncières",
  "641000": "Rémunérations du personnel",
  "644000": "Rémunération du travail de l'exploitant",
  "645000": "Charges de sécurité sociale et de prévoyance",
  "646000": "Cotisations sociales personnelles de l'exploitant",
  "651000": "Redevances pour concessions, brevets, licences",
  "661000": "Charges d'intérêts",
  "671200": "Pénalités, amendes fiscales et pénales",
  "671800": "Autres charges exceptionnelles de gestion",
  "681100": "Dotations aux amortissements des immobilisations",
  "681500": "Dotations aux provisions pour risques et charges",
  "681700": "Dotations aux dépréciations des actifs circulants",
  "695000": "Impôts sur les bénéfices",
  "701000": "Ventes de produits finis",
  "706000": "Prestations de services",
  "707000": "Ventes de marchandises",
  "708000": "Produits des activités annexes",
  "713500": "Variation des stocks de produits",
  "740000": "Subventions d'exploitation",
  "768000": "Autres produits financiers",
  "771800": "Autres produits exceptionnels de gestion",
  "791000": "Transferts de charges d'exploitation",
}

/* -------------------------------------------------------------------------- */
/* Profils d'activité                                                          */
/* -------------------------------------------------------------------------- */

interface Profile {
  sales: [string, number][]
  charges: [string, number][]
  /** Compte ajusté pour atteindre la marge cible */
  main: string
  socialRate: number
  immo: [string, number][]
  stock: { account: string; days: number; base: "607000" | "601000" } | null
  clientDays: number
  supplierDays: number
  cashDays: number
  debtRatio: number
  /** Saisonnalité janvier → décembre */
  seasonality: number[]
  caisse: boolean
}

const FLAT = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

const PROFILES: Record<string, Profile> = {
  services: {
    sales: [["706000", 0.99], ["708000", 0.01]],
    charges: [["604000", 0.04], ["606100", 0.006], ["606300", 0.008], ["606400", 0.004], ["613200", 0.035], ["615000", 0.006], ["616000", 0.007], ["622600", 0.012], ["623000", 0.012], ["625100", 0.014], ["626000", 0.008], ["627000", 0.002], ["628800", 0.01], ["635110", 0.006], ["631100", 0.004]],
    main: "641000",
    socialRate: 0.42,
    immo: [["218300", 0.05], ["218400", 0.025], ["218100", 0.03], ["205000", 0.01]],
    stock: null,
    clientDays: 52,
    supplierDays: 38,
    cashDays: 42,
    debtRatio: 0.45,
    seasonality: [1, 1, 1.05, 1, 1.02, 1.05, 0.95, 0.6, 1.05, 1.1, 1.08, 1.1],
    caisse: false,
  },
  commerce: {
    sales: [["707000", 0.97], ["708000", 0.03]],
    charges: [["606100", 0.012], ["606300", 0.006], ["606400", 0.003], ["613200", 0.045], ["615000", 0.006], ["616000", 0.006], ["622600", 0.008], ["623000", 0.012], ["624100", 0.006], ["626000", 0.004], ["627000", 0.004], ["628800", 0.006], ["635110", 0.006], ["641000", 0.12], ["645000", 0.045]],
    main: "607000",
    socialRate: 0.38,
    immo: [["207000", 0.12], ["218100", 0.06], ["218300", 0.012], ["218400", 0.02]],
    stock: { account: "370000", days: 62, base: "607000" },
    clientDays: 6,
    supplierDays: 45,
    cashDays: 28,
    debtRatio: 0.5,
    seasonality: [0.82, 0.86, 0.95, 0.98, 1, 0.98, 1.02, 0.94, 0.98, 1.02, 1.1, 1.35],
    caisse: true,
  },
  ecommerce: {
    sales: [["707000", 0.96], ["708000", 0.04]],
    charges: [["606400", 0.003], ["613200", 0.015], ["616000", 0.004], ["622600", 0.01], ["623000", 0.085], ["624100", 0.06], ["626000", 0.012], ["627000", 0.012], ["628800", 0.025], ["651000", 0.02], ["635110", 0.004], ["641000", 0.09], ["645000", 0.036]],
    main: "607000",
    socialRate: 0.4,
    immo: [["205000", 0.025], ["218300", 0.015], ["218400", 0.006]],
    stock: { account: "370000", days: 75, base: "607000" },
    clientDays: 3,
    supplierDays: 40,
    cashDays: 35,
    debtRatio: 0.3,
    seasonality: [0.85, 0.75, 0.85, 0.9, 0.95, 0.9, 0.95, 0.85, 1, 1.1, 1.45, 1.45],
    caisse: false,
  },
  gros: {
    sales: [["707000", 0.99], ["708000", 0.01]],
    charges: [["606100", 0.006], ["613200", 0.01], ["613500", 0.004], ["615000", 0.004], ["616000", 0.003], ["622600", 0.003], ["624100", 0.025], ["626000", 0.002], ["627000", 0.002], ["628800", 0.004], ["635110", 0.003], ["641000", 0.06], ["645000", 0.024]],
    main: "607000",
    socialRate: 0.4,
    immo: [["215400", 0.03], ["218200", 0.035], ["218300", 0.004]],
    stock: { account: "370000", days: 9, base: "607000" },
    clientDays: 38,
    supplierDays: 30,
    cashDays: 18,
    debtRatio: 0.55,
    seasonality: [0.7, 0.7, 0.8, 0.95, 1.15, 1.35, 1.4, 1.3, 1.2, 0.95, 0.75, 0.75],
    caisse: false,
  },
  pharmacie: {
    sales: [["707000", 0.985], ["708000", 0.015]],
    charges: [["606100", 0.004], ["613200", 0.018], ["615000", 0.003], ["616000", 0.002], ["622600", 0.006], ["626000", 0.002], ["627000", 0.004], ["628800", 0.006], ["635110", 0.004], ["641000", 0.08], ["645000", 0.032]],
    main: "607000",
    socialRate: 0.4,
    immo: [["207000", 0.75], ["218100", 0.05], ["218300", 0.01]],
    stock: { account: "370000", days: 55, base: "607000" },
    clientDays: 12,
    supplierDays: 35,
    cashDays: 20,
    debtRatio: 0.75,
    seasonality: [1.1, 1.05, 1.02, 0.98, 0.96, 0.95, 0.92, 0.88, 0.98, 1.02, 1.05, 1.09],
    caisse: true,
  },
  optique: {
    sales: [["707000", 0.98], ["708000", 0.02]],
    charges: [["606100", 0.006], ["613200", 0.05], ["615000", 0.004], ["616000", 0.004], ["622600", 0.01], ["623000", 0.025], ["626000", 0.004], ["627000", 0.006], ["628800", 0.012], ["635110", 0.006], ["641000", 0.17], ["645000", 0.068]],
    main: "607000",
    socialRate: 0.4,
    immo: [["207000", 0.18], ["218100", 0.08], ["215400", 0.04]],
    stock: { account: "370000", days: 120, base: "607000" },
    clientDays: 18,
    supplierDays: 55,
    cashDays: 24,
    debtRatio: 0.6,
    seasonality: [0.85, 0.85, 0.95, 0.95, 1, 1.05, 1.1, 1.05, 1.15, 1, 0.95, 1.1],
    caisse: true,
  },
  boulangerie: {
    sales: [["701000", 0.92], ["707000", 0.08]],
    charges: [["601000", 0.27], ["606100", 0.045], ["606300", 0.008], ["613200", 0.05], ["615000", 0.012], ["616000", 0.006], ["622600", 0.01], ["626000", 0.003], ["627000", 0.004], ["628800", 0.006], ["635110", 0.005]],
    main: "641000",
    socialRate: 0.36,
    immo: [["207000", 0.25], ["215400", 0.16], ["218100", 0.08]],
    stock: { account: "310000", days: 10, base: "601000" },
    clientDays: 4,
    supplierDays: 30,
    cashDays: 22,
    debtRatio: 0.6,
    seasonality: [0.95, 0.92, 0.98, 1.02, 1, 0.98, 0.95, 0.85, 1, 1.02, 1.05, 1.28],
    caisse: true,
  },
  restauration: {
    sales: [["706000", 0.94], ["707000", 0.06]],
    charges: [["601000", 0.285], ["606100", 0.035], ["606300", 0.012], ["613200", 0.06], ["615000", 0.012], ["616000", 0.008], ["622600", 0.009], ["623000", 0.008], ["626000", 0.004], ["627000", 0.009], ["628800", 0.012], ["635110", 0.006]],
    main: "641000",
    socialRate: 0.3,
    immo: [["207000", 0.22], ["218100", 0.14], ["215400", 0.08], ["218400", 0.04]],
    stock: { account: "310000", days: 9, base: "601000" },
    clientDays: 3,
    supplierDays: 28,
    cashDays: 20,
    debtRatio: 0.6,
    seasonality: [0.78, 0.82, 0.92, 1, 1.05, 1.12, 1.25, 1.28, 1.05, 0.95, 0.85, 0.93],
    caisse: true,
  },
  btp: {
    sales: [["706000", 0.97], ["708000", 0.03]],
    charges: [["601000", 0.3], ["611000", 0.11], ["606100", 0.022], ["606300", 0.012], ["613200", 0.012], ["613500", 0.015], ["615000", 0.01], ["616000", 0.018], ["622600", 0.008], ["625100", 0.004], ["626000", 0.004], ["627000", 0.002], ["628800", 0.006], ["635110", 0.005]],
    main: "641000",
    socialRate: 0.44,
    immo: [["215400", 0.07], ["218200", 0.06], ["218300", 0.008]],
    stock: { account: "310000", days: 15, base: "601000" },
    clientDays: 58,
    supplierDays: 50,
    cashDays: 30,
    debtRatio: 0.55,
    seasonality: [0.85, 0.9, 1.02, 1.05, 1.05, 1.08, 1.05, 0.55, 1.05, 1.1, 1.08, 1.12],
    caisse: false,
  },
  industrie: {
    sales: [["701000", 0.94], ["706000", 0.04], ["708000", 0.02]],
    charges: [["606100", 0.03], ["606300", 0.01], ["613200", 0.025], ["613500", 0.008], ["615000", 0.015], ["616000", 0.008], ["622600", 0.01], ["623000", 0.01], ["624100", 0.015], ["626000", 0.004], ["627000", 0.002], ["628800", 0.008], ["635110", 0.008], ["641000", 0.24], ["645000", 0.1]],
    main: "601000",
    socialRate: 0.42,
    immo: [["215400", 0.28], ["218100", 0.05], ["218200", 0.03], ["218300", 0.01]],
    stock: { account: "310000", days: 55, base: "601000" },
    clientDays: 55,
    supplierDays: 55,
    cashDays: 26,
    debtRatio: 0.55,
    seasonality: [0.95, 1, 1.05, 1.02, 1.02, 1.05, 1, 0.62, 1.05, 1.08, 1.06, 1.1],
    caisse: false,
  },
  chocolaterie: {
    sales: [["701000", 0.9], ["707000", 0.1]],
    charges: [["606100", 0.035], ["606300", 0.012], ["613200", 0.04], ["615000", 0.01], ["616000", 0.006], ["622600", 0.01], ["623000", 0.02], ["624100", 0.012], ["626000", 0.004], ["627000", 0.006], ["628800", 0.008], ["635110", 0.006], ["641000", 0.24], ["645000", 0.09]],
    main: "601000",
    socialRate: 0.38,
    immo: [["207000", 0.08], ["215400", 0.16], ["218100", 0.06]],
    stock: { account: "310000", days: 40, base: "601000" },
    clientDays: 20,
    supplierDays: 40,
    cashDays: 30,
    debtRatio: 0.5,
    seasonality: [0.7, 0.9, 1.25, 1.45, 0.75, 0.6, 0.5, 0.5, 0.75, 1, 1.35, 2.25],
    caisse: true,
  },
  transport: {
    sales: [["706000", 0.98], ["708000", 0.02]],
    charges: [["606100", 0.19], ["606300", 0.006], ["613200", 0.015], ["613500", 0.06], ["615000", 0.055], ["616000", 0.03], ["622600", 0.006], ["625100", 0.012], ["626000", 0.006], ["627000", 0.003], ["628800", 0.01], ["635110", 0.006]],
    main: "641000",
    socialRate: 0.4,
    immo: [["218200", 0.32], ["218300", 0.006], ["218100", 0.02]],
    stock: null,
    clientDays: 50,
    supplierDays: 40,
    cashDays: 18,
    debtRatio: 0.7,
    seasonality: [0.92, 0.95, 1.02, 1, 1.02, 1.05, 1, 0.82, 1.05, 1.08, 1.04, 1.05],
    caisse: false,
  },
  dentaire: {
    sales: [["706000", 1]],
    charges: [["604000", 0.12], ["606100", 0.008], ["606300", 0.035], ["613200", 0.05], ["615000", 0.012], ["616000", 0.006], ["622600", 0.012], ["626000", 0.004], ["627000", 0.004], ["628800", 0.01], ["635110", 0.006]],
    main: "641000",
    socialRate: 0.42,
    immo: [["207000", 0.3], ["215400", 0.2], ["218100", 0.08]],
    stock: null,
    clientDays: 8,
    supplierDays: 35,
    cashDays: 35,
    debtRatio: 0.6,
    seasonality: [1.02, 1.02, 1.05, 1, 1, 1, 0.92, 0.72, 1.02, 1.05, 1.05, 0.95],
    caisse: false,
  },
  immobilier: {
    sales: [["706000", 1]],
    charges: [["615000", 0.06], ["616000", 0.025], ["622600", 0.02], ["627000", 0.003], ["628800", 0.01]],
    main: "635120",
    socialRate: 0,
    immo: [["211000", 2.2], ["213000", 9.5]],
    stock: null,
    clientDays: 20,
    supplierDays: 30,
    cashDays: 60,
    debtRatio: 0.55,
    seasonality: FLAT,
    caisse: false,
  },
}

const PROFILE_BY_ID: Record<string, string> = {
  "nuage-bleu": "ecommerce",
  "comptoir-vergers": "gros",
  "pharmacie-arcades": "pharmacie",
  "lumen-optique": "optique",
  "fournil-antan": "boulangerie",
  "maison-praline": "chocolaterie",
  "dentaire-tilleuls": "dentaire",
  "cave-comptoir": "commerce",
  "cycles-randonnees": "commerce",
}

function profileFor(d: Dossier): Profile {
  const key = PROFILE_BY_ID[d.id] ?? d.sector
  return PROFILES[key] ?? PROFILES.services!
}

/** Marge d'exploitation [N, N-1] imposée pour certains dossiers (scénarios de démo) */
const MARGIN_OVERRIDES: Record<string, [number, number]> = {
  "transports-moreau": [-0.061, -0.009],
  "cap-horizon": [-0.024, 0.031],
  "orbital-data-lab": [0.214, 0.168],
  "kaleido-software": [0.126, 0.097],
  "helios-energies": [0.094, 0.079],
  "quanta-robotique": [0.087, 0.078],
  "trois-chenes": [0.008, 0.046],
  "cycles-randonnees": [-0.017, 0.049],
  "nuage-bleu": [0.061, 0.038],
  "terrasses-orme": [0.58, 0.56],
  "maison-praline": [0.052, 0.067],
}

/* -------------------------------------------------------------------------- */
/* Génération                                                                  */
/* -------------------------------------------------------------------------- */

type Accounts = Map<string, number>

interface YearState {
  accounts: Accounts
  result: number
  is: number
  stockEnd: number
  immoBrut: Map<string, number>
  amort: Map<string, number>
  loan: number
  equity: { capital: number; legal: number; other: number; ran: number }
  monthly: number[]
}

const AMORT_ACCOUNT: Record<string, string | null> = {
  "205000": "280500",
  "207000": null,
  "211000": null,
  "213000": "281300",
  "215400": "281540",
  "218100": "281810",
  "218200": "281820",
  "218300": "281830",
  "218400": "281840",
}

const AMORT_RATE: Record<string, number> = {
  "205000": 0.33,
  "213000": 0.04,
  "215400": 0.15,
  "218100": 0.1,
  "218200": 0.2,
  "218300": 0.33,
  "218400": 0.12,
}

const OPERATING_PRODUCTS = ["70", "71", "72", "74", "75", "781", "791"]
const OPERATING_CHARGES = ["60", "61", "62", "63", "64", "65", "681"]

function sumWhere(acc: Accounts, prefixes: string[]) {
  let total = 0
  for (const [a, v] of acc) if (prefixes.some((p) => a.startsWith(p))) total += v
  return total
}

function isCompanyTax(d: Dossier) {
  return d.taxRegime === "IS_RN" || d.taxRegime === "IS_RSI"
}

/** IS 2026 : 15 % jusqu'à 42 500 € (taux réduit PME), 25 % au-delà */
function corporateTax(base: number) {
  if (base <= 0) return 0
  return Math.round(Math.min(base, 42_500) * 0.15 + Math.max(0, base - 42_500) * 0.25)
}

function buildYear(
  d: Dossier,
  p: Profile,
  r: Rng,
  ca: number,
  margin: number,
  prev: YearState | null,
  startMonth: number,
): YearState {
  const acc: Accounts = new Map()
  const add = (account: string, value: number) => {
    const v = Math.round(value)
    if (v === 0) return
    acc.set(account, (acc.get(account) ?? 0) + v)
  }

  // 1. Chiffre d'affaires (soldes créditeurs → négatifs)
  const shares = p.sales.map(([a, s]) => [a, s * r.jitter(0.03)] as const)
  const totalShare = shares.reduce((s, [, v]) => s + v, 0)
  let allocated = 0
  shares.forEach(([a, s], i) => {
    const amount = i === shares.length - 1 ? ca - allocated : Math.round((ca * s) / totalShare)
    allocated += amount
    add(a, -amount)
  })
  if (d.employees > 0) add("791000", -ca * r.float(0.0008, 0.003))
  if (r.chance(0.12)) add("740000", -ca * r.float(0.002, 0.01))

  // 2. Immobilisations
  const immoBrut = new Map<string, number>()
  const amort = new Map<string, number>()
  for (const [a, ratio] of p.immo) {
    const brut = prev
      ? (prev.immoBrut.get(a) ?? 0) * (1 + (r.chance(0.55) ? r.float(0.02, 0.18) : 0))
      : ca * ratio * r.jitter(0.25)
    immoBrut.set(a, Math.round(brut))
  }
  let dotations = 0
  for (const [a, brut] of immoBrut) {
    const amortAccount = AMORT_ACCOUNT[a]
    if (!amortAccount) continue
    const rate = AMORT_RATE[a] ?? 0.15
    const dot = Math.round(brut * rate * r.jitter(0.1))
    const start = prev ? (prev.amort.get(amortAccount) ?? 0) : Math.round(brut * r.float(0.3, 0.55))
    const cumul = Math.min(brut, start + (prev ? dot : 0))
    amort.set(amortAccount, cumul)
    dotations += dot
  }
  add("681100", dotations)

  // 3. Charges hors compte d'ajustement
  for (const [a, ratio] of p.charges) {
    if (a === p.main) continue
    if (a === "645000") continue
    add(a, ca * ratio * r.jitter(0.12))
  }
  if (p.charges.some(([a]) => a === "641000") && p.main !== "641000") {
    add("645000", (acc.get("641000") ?? 0) * p.socialRate * r.jitter(0.05))
  }

  // 4. Stocks et variation
  let stockEnd = 0
  if (p.stock) {
    // Consommation estimée (le compte principal n'est connu qu'après l'ajustement de marge)
    const ratio = p.charges.find(([a]) => a === p.stock!.base)?.[1] ?? 0.5
    const consumption = ca * ratio
    stockEnd = Math.round(((p.stock.days * r.jitter(0.15)) / 365) * consumption)
    const stockStart = prev ? prev.stockEnd : Math.round(stockEnd * r.jitter(0.12))
    add(p.stock.account, stockEnd)
    add(p.stock.base === "607000" ? "603700" : "603100", stockStart - stockEnd)
  }

  // 5. Ajustement du compte principal pour atteindre la marge d'exploitation cible
  const produits = -sumWhere(acc, OPERATING_PRODUCTS)
  const charges = sumWhere(acc, OPERATING_CHARGES)
  const needed = Math.max(produits - charges - margin * ca, ca * 0.03)
  if (p.main === "641000") {
    const salaries = needed / (1 + p.socialRate)
    add("641000", salaries)
    add("645000", salaries * p.socialRate)
  } else {
    add(p.main, needed)
  }

  // Litige apparu sur l'exercice N : dotation pour risque (dégrade la marge)
  const litigation = prev && LITIGATION.has(d.id) ? Math.round(ca * r.float(0.006, 0.014)) : 0
  if (litigation) add("681500", litigation)
  const provisionStock = prev ? (prev.accounts.get("151100") ?? 0) : 0

  // 6. Résultat financier et exceptionnel
  const loanBase = [...immoBrut.values()].reduce((s, v) => s + v, 0) * p.debtRatio
  const loan = prev ? Math.round(prev.loan * r.float(0.72, 0.9) + (r.chance(0.25) ? loanBase * 0.25 : 0)) : Math.round(loanBase * r.float(0.35, 0.75))
  add("661000", loan * r.float(0.028, 0.041))
  if (r.chance(0.5)) add("768000", -ca * r.float(0.0002, 0.0015))
  if (r.chance(0.3)) add("671200", r.int(90, 1_800))
  if (r.chance(0.35)) add("671800", ca * r.float(0.0005, 0.004))
  if (r.chance(0.35)) add("771800", -ca * r.float(0.0005, 0.004))

  // 7. Impôt sur les sociétés
  const preTax = -sumWhere(acc, ["6", "7"])
  let is = 0
  if (isCompanyTax(d)) {
    is = corporateTax(preTax + (acc.get("671200") ?? 0))
    add("695000", is)
  }
  const result = -sumWhere(acc, ["6", "7"])

  // 8. Bilan
  for (const [a, brut] of immoBrut) add(a, brut)
  for (const [a, cumul] of amort) add(a, -cumul)
  if (acc.has("613200")) add("275000", (acc.get("613200") ?? 0) * r.float(0.15, 0.3))

  const purchases = sumWhere(acc, ["601", "602", "604", "605", "606", "607", "61", "62"])
  add("411000", ((p.clientDays * r.jitter(0.18)) / 365) * ca * 1.2)
  if (p.clientDays > 30 && r.chance(0.6)) add("418100", ca * r.float(0.005, 0.02))
  add("401000", -((p.supplierDays * r.jitter(0.18)) / 365) * purchases * 1.2)
  add("408100", -purchases * r.float(0.008, 0.03))
  if (r.chance(0.25)) add("409100", purchases * r.float(0.002, 0.008))

  const salaries = acc.get("641000") ?? 0
  const social = acc.get("645000") ?? 0
  if (salaries > 0) {
    if (r.chance(0.3)) add("421000", -salaries / 12 * r.float(0.05, 0.2))
    add("431000", -((salaries + social) / 12) * r.float(0.45, 0.6))
    add("437000", -((salaries + social) / 12) * r.float(0.15, 0.25))
    const cp = salaries * r.float(0.07, 0.1)
    add("428200", -cp)
    add("438600", -cp * 0.42)
  }

  if (d.vatRegime !== "exonere") {
    const collected = (ca / 12) * 0.2 * r.jitter(0.2)
    const deductible = (purchases / 12) * 0.2 * r.float(0.75, 0.95)
    add("445510", -Math.max(0, collected - deductible) * (d.vatRegime === "RSI" ? 0.6 : 1))
    add("445660", deductible * r.float(0.2, 0.45))
  }
  if (isCompanyTax(d)) {
    const acomptes = prev ? prev.is * r.float(0.9, 1) : is * r.float(0.75, 1.05)
    add("444000", -(is - acomptes))
  }
  add("447000", -ca * r.float(0.0005, 0.002))
  add("486000", purchases * r.float(0.015, 0.035))
  if (p.sales.some(([a]) => a === "706000") && r.chance(0.35)) add("487000", -ca * r.float(0.005, 0.025))
  if (r.chance(0.3)) add("467000", r.chance(0.5) ? ca * r.float(0.001, 0.004) : -ca * r.float(0.001, 0.004))
  if (p.caisse) add("530000", ca * r.float(0.0008, 0.003))
  if (loan > 0) add("164000", -loan)
  if (litigation || provisionStock) add("151100", provisionStock - litigation)

  // Capitaux propres d'ouverture
  let equity: YearState["equity"]
  if (prev) {
    const retained = prev.result
    const legalAlloc =
      retained > 0 ? Math.min(Math.round(retained * 0.05), Math.max(0, Math.round(d.capital * 0.1) - prev.equity.legal)) : 0
    const distribution =
      retained > 0 ? Math.round(retained * (isCompanyTax(d) ? r.float(0.15, 0.55) : r.float(0.6, 0.9))) : 0
    equity = {
      capital: prev.equity.capital,
      legal: prev.equity.legal + legalAlloc,
      other: prev.equity.other,
      ran: prev.equity.ran + retained - legalAlloc - distribution,
    }
  } else {
    equity = {
      capital: d.capital,
      legal: Math.round(d.capital * 0.1),
      other: r.chance(0.5) && isCompanyTax(d) ? Math.round(ca * r.float(0.01, 0.06)) : 0,
      ran: Math.round(ca * r.float(-0.01, 0.06)),
    }
  }

  // 9. Équilibre par la banque (et éventuellement le compte courant / concours bancaires)
  const minCash = ca * 0.012
  const maxCash = (ca * p.cashDays * 2.2) / 365
  const equityTotal = () => equity.capital + equity.legal + equity.other + equity.ran
  const balanceWithoutBank = () => sumWhere(acc, [""]) - equityTotal()
  let bank = -balanceWithoutBank()
  if (!prev && bank > maxCash) {
    equity.ran -= Math.round(bank - maxCash)
    bank = -balanceWithoutBank()
  }
  if (bank < minCash) {
    const shortfall = Math.round(minCash - bank)
    const owner = ["SARL", "EURL", "SCI", "SELARL"].includes(d.legalForm)
    add(owner ? "455000" : "519100", -shortfall)
    bank = -balanceWithoutBank()
  } else if (["SARL", "EURL", "SCI", "SELARL"].includes(d.legalForm) && r.chance(0.5)) {
    const cc = Math.round(Math.min(bank * 0.4, ca * r.float(0.01, 0.05)))
    add("455000", -cc)
    bank += cc
  }
  add("512000", bank)

  add("101300", -equity.capital)
  add("106100", -equity.legal)
  add("106800", -equity.other)
  if (equity.ran >= 0) add("110000", -equity.ran)
  else add("119000", -equity.ran)

  // CA mensuel (saisonnalité)
  const seasons = Array.from({ length: 12 }, (_, i) => {
    const calendarMonth = ((startMonth - 1 + i) % 12) as number
    return (p.seasonality[calendarMonth] ?? 1) * r.jitter(0.06)
  })
  const totalSeason = seasons.reduce((s, v) => s + v, 0)
  const monthly = seasons.map((s) => Math.round((ca * s) / totalSeason))

  return { accounts: acc, result, is, stockEnd, immoBrut, amort, loan, equity, monthly }
}

export interface FinancialData {
  lines: BalanceLine[]
  monthly: { label: string; n: number; n1: number }[]
  result: { n: number; n1: number }
}

/** Dossiers avec un litige apparu sur l'exercice (provision pour risque) */
const LITIGATION = new Set(["cap-horizon", "transports-moreau", "quanta-robotique"])

/** Dossiers où un compte d'attente reste ouvert à la clôture (en plus du tirage aléatoire) */
const SUSPENSE_ACCOUNT = new Set(["maison-praline", "transports-moreau", "bati-renov", "opaline-logistique"])

/**
 * Anomalies volontairement injectées pour la démo (contrôles automatiques).
 * Chaque mouvement est compensé sur la banque : la balance reste équilibrée.
 */
function injectAnomalies(d: Dossier, acc: Accounts, r: Rng) {
  const setWithBankOffset = (account: string, value: number) => {
    const delta = value - (acc.get(account) ?? 0)
    acc.set(account, value)
    acc.set("512000", (acc.get("512000") ?? 0) - delta)
  }
  if (SUSPENSE_ACCOUNT.has(d.id) || (!isFinalized(d.id) && r.chance(0.5))) {
    setWithBankOffset("471000", Math.round(d.revenue * r.float(0.002, 0.009)))
  }
  // Compte courant d'associé débiteur (interdit en SARL pour un associé personne physique)
  if (d.id === "cave-comptoir") setWithBankOffset("455000", 3_840)
}

const cache = new Map<string, FinancialData>()

export function getFinancials(d: Dossier): FinancialData {
  const cached = cache.get(d.id)
  if (cached) return cached

  const r = createRng(`balance:${d.id}`)
  const p = profileFor(d)
  const { current } = lastClosedExercises(d)
  const startMonth = new Date(current.start).getUTCMonth() + 1

  const [marginN, marginN1] = MARGIN_OVERRIDES[d.id] ?? (() => {
    const m = r.float(0.025, 0.12)
    return [m, m - r.float(-0.025, 0.03)] as [number, number]
  })()

  const caN = d.revenue
  const caN1 = Math.round(d.revenue / (1 + d.growth))
  const yearN1 = buildYear(d, p, r, caN1, marginN1, null, startMonth)
  const yearN = buildYear(d, p, r, caN, marginN, yearN1, startMonth)
  injectAnomalies(d, yearN.accounts, r)

  const accounts = new Set([...yearN.accounts.keys(), ...yearN1.accounts.keys()])
  const lines: BalanceLine[] = [...accounts]
    .sort()
    .map((account) => ({
      account,
      label:
        d.sector === "immobilier" && account === "706000"
          ? "Loyers"
          : (LABELS[account] ?? `Compte ${account}`),
      group: groupFor(account),
      n: yearN.accounts.get(account) ?? 0,
      n1: yearN1.accounts.get(account) ?? 0,
    }))
    .filter((l) => l.n !== 0 || l.n1 !== 0)

  const months = exerciseMonths(current)
  const data: FinancialData = {
    lines,
    monthly: months.map((m, i) => ({
      label: m.label,
      n: yearN.monthly[i] ?? 0,
      n1: yearN1.monthly[i] ?? 0,
    })),
    result: { n: yearN.result, n1: yearN1.result },
  }
  cache.set(d.id, data)
  return data
}

/* -------------------------------------------------------------------------- */
/* Agrégats                                                                    */
/* -------------------------------------------------------------------------- */

export function sumAccounts(lines: BalanceLine[], prefixes: string[], key: "n" | "n1") {
  return lines
    .filter((l) => prefixes.some((p) => l.account.startsWith(p)))
    .reduce((s, l) => s + l[key], 0)
}

export interface GroupRow {
  group: GroupDef
  n: number
  n1: number
  lines: BalanceLine[]
}

export function groupRows(lines: BalanceLine[]): GroupRow[] {
  return GROUPS.map((g) => {
    const gl = lines.filter((l) => l.group === g.id)
    return {
      group: g,
      n: gl.reduce((s, l) => s + l.n, 0) * g.sign,
      n1: gl.reduce((s, l) => s + l.n1, 0) * g.sign,
      lines: gl,
    }
  }).filter((row) => row.lines.length > 0)
}

export interface Indicators {
  ca: number
  margeCommerciale: number | null
  valeurAjoutee: number
  ebe: number
  resultatExploitation: number
  resultatFinancier: number
  resultatCourant: number
  resultatNet: number
  caf: number
  capitauxPropres: number
  endettement: number
  tresorerieNette: number
  bfr: number
  totalBilan: number
  stocks: number
  clients: number
  fournisseurs: number
  masseSalariale: number
  achatsConsommes: number
}

export function computeIndicators(lines: BalanceLine[], key: "n" | "n1"): Indicators {
  // Somme des soldes (débit positif / crédit négatif) des comptes commençant par…
  const s = (...prefixes: string[]) => sumAccounts(lines, prefixes, key)
  const ca = -s("70")
  const ventesMarch = -s("707")
  const achatsMarch = s("607", "6037")
  const production = -s("701", "706", "708", "71", "72")
  const consommations = s("601", "602", "6031", "6032", "604", "605", "606", "61", "62")
  const margeCommerciale = ventesMarch > 0 ? ventesMarch - achatsMarch : null
  const valeurAjoutee = (margeCommerciale ?? 0) + production - consommations
  const subventions = -s("74")
  const ebe = valeurAjoutee + subventions - s("63") - s("64")
  const autresProduitsExpl = -s("75", "781", "791")
  const resultatExploitation = ebe + autresProduitsExpl - s("65") - s("681")
  const resultatFinancier = -s("76") - s("66")
  const resultatCourant = resultatExploitation + resultatFinancier
  const resultatNet = -s("6", "7")
  const reprises = -s("78")
  const caf = resultatNet + s("681") - reprises
  const capitauxPropres = -s("10", "11") + resultatNet
  const endettement = -s("16", "519")
  const tresorerieNette = s("512", "53") + s("519")
  const stocks = s("3")
  const clients = s("411", "416", "418", "491")
  const fournisseurs = -s("401", "408")
  const autresCreances = s("409", "4456", "486", "467", "471")
  const dettesFiscSoc = -(s("42", "43", "44") - s("4456"))
  const autresDettes = -s("419", "455", "487")
  const bfr = stocks + clients + autresCreances - fournisseurs - dettesFiscSoc - autresDettes
  const actifImmo = s("2")
  const totalBilan =
    actifImmo + stocks + clients + Math.max(0, autresCreances) + Math.max(0, s("512", "53"))
  return {
    ca,
    margeCommerciale,
    valeurAjoutee,
    ebe,
    resultatExploitation,
    resultatFinancier,
    resultatCourant,
    resultatNet,
    caf,
    capitauxPropres,
    endettement,
    tresorerieNette,
    bfr,
    totalBilan,
    stocks,
    clients,
    fournisseurs,
    masseSalariale: s("641", "644", "645", "646"),
    achatsConsommes: s("601", "6031", "607", "6037"),
  }
}
