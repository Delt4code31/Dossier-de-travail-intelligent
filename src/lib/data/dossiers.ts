import { createRng } from "./rng"
import type {
  Dossier,
  LegalForm,
  MissionType,
  Sector,
  TaxRegime,
  Thresholds,
  VatRegime,
} from "./types"

/**
 * Portefeuille fictif de 30 dossiers clients.
 * Les noms, SIREN (volontairement invalides) et adresses sont inventés.
 */

interface DossierSeed {
  id: string
  name: string
  legalForm: LegalForm
  sector: Sector
  naf: [string, string]
  city: [string, string]
  closing: string
  revenue: number
  growth: number
  employees: number
  capital: number
  mission: MissionType
  taxRegime: TaxRegime
  vatRegime: VatRegime
  team: [string, string, string]
}

const SEEDS: DossierSeed[] = [
  { id: "altimetre-studio", name: "SAS ALTIMÈTRE STUDIO", legalForm: "SAS", sector: "services", naf: ["74.10Z", "Activités spécialisées de design"], city: ["31000", "Toulouse"], closing: "12-31", revenue: 1_240_000, growth: 0.082, employees: 11, capital: 20_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "jardins-maeva", name: "SARL LES JARDINS DE MAÉVA", legalForm: "SARL", sector: "services", naf: ["81.30Z", "Services d'aménagement paysager"], city: ["31770", "Colomiers"], closing: "12-31", revenue: 640_000, growth: 0.12, employees: 7, capital: 8_000, mission: "tenue_presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["ines", "camille", "yann"] },
  { id: "brasserie-canal-vert", name: "SAS BRASSERIE DU CANAL VERT", legalForm: "SAS", sector: "restauration", naf: ["56.10A", "Restauration traditionnelle"], city: ["31000", "Toulouse"], closing: "12-31", revenue: 980_000, growth: -0.041, employees: 14, capital: 10_000, mission: "tenue_presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["hugo", "camille", "yann"] },
  { id: "opaline-logistique", name: "SAS OPALINE LOGISTIQUE", legalForm: "SAS", sector: "transport", naf: ["49.41A", "Transports routiers de fret interurbains"], city: ["82000", "Montauban"], closing: "06-30", revenue: 3_400_000, growth: 0.153, employees: 26, capital: 50_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lea", "manon", "sophie"] },
  { id: "menuiserie-charvet", name: "SARL MENUISERIE CHARVET & FILS", legalForm: "SARL", sector: "btp", naf: ["43.32A", "Travaux de menuiserie bois et PVC"], city: ["81000", "Albi"], closing: "12-31", revenue: 1_120_000, growth: 0.031, employees: 9, capital: 15_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["ines", "camille", "yann"] },
  { id: "kaleido-software", name: "SAS KALÉIDO SOFTWARE", legalForm: "SAS", sector: "services", naf: ["58.29C", "Édition de logiciels applicatifs"], city: ["31670", "Labège"], closing: "12-31", revenue: 2_150_000, growth: 0.221, employees: 18, capital: 120_000, mission: "examen_limite", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "terrasses-orme", name: "SCI LES TERRASSES DE L'ORME", legalForm: "SCI", sector: "immobilier", naf: ["68.20B", "Location de terrains et d'autres biens immobiliers"], city: ["31700", "Blagnac"], closing: "12-31", revenue: 186_000, growth: 0.021, employees: 0, capital: 1_000, mission: "tenue_presentation", taxRegime: "IR_RF", vatRegime: "exonere", team: ["ines", "camille", "yann"] },
  { id: "pharmacie-arcades", name: "SELARL PHARMACIE DES ARCADES", legalForm: "SELARL", sector: "sante", naf: ["47.73Z", "Commerce de détail de produits pharmaceutiques"], city: ["81100", "Castres"], closing: "09-30", revenue: 2_600_000, growth: 0.038, employees: 8, capital: 30_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lea", "manon", "sophie"] },
  { id: "fournil-antan", name: "SARL FOURNIL D'ANTAN", legalForm: "SARL", sector: "commerce", naf: ["10.71C", "Boulangerie et boulangerie-pâtisserie"], city: ["31600", "Muret"], closing: "03-31", revenue: 420_000, growth: 0.058, employees: 5, capital: 7_500, mission: "tenue_presentation", taxRegime: "IS_RSI", vatRegime: "RSI", team: ["hugo", "camille", "yann"] },
  { id: "cap-horizon", name: "SAS CAP HORIZON VOYAGES", legalForm: "SAS", sector: "services", naf: ["79.11Z", "Activités des agences de voyage"], city: ["31000", "Toulouse"], closing: "12-31", revenue: 1_870_000, growth: -0.092, employees: 6, capital: 40_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "electro-lambert", name: "SAS ÉLECTRO-SERVICES LAMBERT", legalForm: "SAS", sector: "btp", naf: ["43.21A", "Travaux d'installation électrique dans tous locaux"], city: ["31130", "Balma"], closing: "12-31", revenue: 860_000, growth: 0.049, employees: 6, capital: 5_000, mission: "tenue_presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["ines", "camille", "yann"] },
  { id: "vertigo-escalade", name: "SAS VERTIGO ESCALADE", legalForm: "SAS", sector: "services", naf: ["93.11Z", "Gestion d'installations sportives"], city: ["31200", "Toulouse"], closing: "08-31", revenue: 540_000, growth: 0.184, employees: 7, capital: 60_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["hugo", "camille", "yann"] },
  { id: "cave-comptoir", name: "SARL CAVE & COMPTOIR DES VIGNES", legalForm: "SARL", sector: "commerce", naf: ["47.25Z", "Commerce de détail de boissons"], city: ["81600", "Gaillac"], closing: "12-31", revenue: 690_000, growth: 0.012, employees: 3, capital: 10_000, mission: "tenue_presentation", taxRegime: "IS_RSI", vatRegime: "RSI", team: ["ines", "camille", "yann"] },
  { id: "nuage-bleu", name: "SAS NUAGE BLEU CRÉATIONS", legalForm: "SAS", sector: "commerce", naf: ["47.91A", "Vente à distance sur catalogue général"], city: ["31000", "Toulouse"], closing: "12-31", revenue: 1_450_000, growth: 0.268, employees: 5, capital: 15_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "ceramique-odile", name: "EURL ATELIER CÉRAMIQUE ODILE", legalForm: "EURL", sector: "industrie", naf: ["23.41Z", "Fabrication d'articles céramiques à usage domestique"], city: ["81170", "Cordes-sur-Ciel"], closing: "12-31", revenue: 142_000, growth: -0.034, employees: 1, capital: 3_000, mission: "tenue_presentation", taxRegime: "IR_BIC_RSI", vatRegime: "RSI", team: ["nathan", "camille", "yann"] },
  { id: "bati-renov", name: "SAS BÂTI-RÉNOV' SOLUTIONS", legalForm: "SAS", sector: "btp", naf: ["43.39Z", "Autres travaux de finition"], city: ["31170", "Tournefeuille"], closing: "06-30", revenue: 2_980_000, growth: 0.091, employees: 21, capital: 100_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lea", "manon", "sophie"] },
  { id: "lumen-optique", name: "SAS LUMEN OPTIQUE", legalForm: "SAS", sector: "commerce", naf: ["47.78A", "Commerces de détail d'optique"], city: ["12000", "Rodez"], closing: "12-31", revenue: 780_000, growth: 0.021, employees: 4, capital: 25_000, mission: "presentation", taxRegime: "IS_RSI", vatRegime: "RSI", team: ["hugo", "camille", "yann"] },
  { id: "transports-moreau", name: "SARL TRANSPORTS MOREAU-DELAGE", legalForm: "SARL", sector: "transport", naf: ["49.41B", "Transports routiers de fret de proximité"], city: ["11400", "Castelnaudary"], closing: "12-31", revenue: 1_680_000, growth: -0.118, employees: 15, capital: 30_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "pixel-papier", name: "SAS PIXEL & PAPIER", legalForm: "SAS", sector: "industrie", naf: ["18.12Z", "Autre imprimerie (labeur)"], city: ["31000", "Toulouse"], closing: "06-30", revenue: 1_090_000, growth: -0.021, employees: 8, capital: 40_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lea", "manon", "sophie"] },
  { id: "helios-energies", name: "SAS HÉLIOS ÉNERGIES", legalForm: "SAS", sector: "btp", naf: ["43.21A", "Travaux d'installation électrique dans tous locaux"], city: ["82000", "Montauban"], closing: "12-31", revenue: 2_450_000, growth: 0.312, employees: 17, capital: 80_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "dentaire-tilleuls", name: "SELARL CABINET DENTAIRE DES TILLEULS", legalForm: "SELARL", sector: "sante", naf: ["86.23Z", "Pratique dentaire"], city: ["31400", "Toulouse"], closing: "12-31", revenue: 720_000, growth: 0.041, employees: 5, capital: 10_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "exonere", team: ["ines", "camille", "yann"] },
  { id: "maison-praline", name: "SAS MAISON PRALINE", legalForm: "SAS", sector: "industrie", naf: ["10.82Z", "Fabrication de cacao, chocolat et confiserie"], city: ["81000", "Albi"], closing: "06-30", revenue: 860_000, growth: 0.072, employees: 9, capital: 20_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["hugo", "camille", "yann"] },
  { id: "cycles-randonnees", name: "SAS CYCLES & RANDONNÉES", legalForm: "SAS", sector: "commerce", naf: ["47.64Z", "Commerce de détail d'articles de sport"], city: ["09000", "Foix"], closing: "09-30", revenue: 1_020_000, growth: -0.108, employees: 6, capital: 30_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "auberge-moulin-blanc", name: "SARL AUBERGE DU MOULIN BLANC", legalForm: "SARL", sector: "restauration", naf: ["55.10Z", "Hôtels et hébergement similaire"], city: ["82140", "Saint-Antonin-Noble-Val"], closing: "12-31", revenue: 1_180_000, growth: 0.052, employees: 16, capital: 50_000, mission: "tenue_presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["nathan", "camille", "yann"] },
  { id: "quanta-robotique", name: "SAS QUANTA ROBOTIQUE", legalForm: "SAS", sector: "industrie", naf: ["28.99B", "Fabrication d'autres machines spécialisées"], city: ["31400", "Toulouse"], closing: "12-31", revenue: 4_600_000, growth: 0.118, employees: 32, capital: 250_000, mission: "audit_contractuel", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lea", "manon", "sophie"] },
  { id: "orbital-data-lab", name: "SAS ORBITAL DATA LAB", legalForm: "SAS", sector: "services", naf: ["70.22Z", "Conseil pour les affaires et autres conseils de gestion"], city: ["31000", "Toulouse"], closing: "06-30", revenue: 690_000, growth: 0.352, employees: 6, capital: 10_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "salon-epure", name: "SARL SALON ÉPURE", legalForm: "SARL", sector: "services", naf: ["96.02A", "Coiffure"], city: ["31770", "Colomiers"], closing: "12-31", revenue: 238_000, growth: 0.031, employees: 4, capital: 5_000, mission: "tenue_presentation", taxRegime: "IS_RSI", vatRegime: "RSI", team: ["nathan", "camille", "yann"] },
  { id: "comptoir-vergers", name: "SAS COMPTOIR DES VERGERS", legalForm: "SAS", sector: "commerce", naf: ["46.31Z", "Commerce de gros de fruits et légumes"], city: ["82200", "Moissac"], closing: "07-31", revenue: 3_900_000, growth: 0.043, employees: 12, capital: 75_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lea", "manon", "sophie"] },
  { id: "argos-securite", name: "SAS ARGOS SÉCURITÉ PRIVÉE", legalForm: "SAS", sector: "services", naf: ["80.10Z", "Activités de sécurité privée"], city: ["31200", "Toulouse"], closing: "12-31", revenue: 2_750_000, growth: 0.061, employees: 58, capital: 40_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["lucas", "thomas", "sophie"] },
  { id: "trois-chenes", name: "SAS ATELIER DES TROIS CHÊNES", legalForm: "SAS", sector: "industrie", naf: ["31.09B", "Fabrication d'autres meubles et industries connexes"], city: ["81500", "Lavaur"], closing: "12-31", revenue: 1_340_000, growth: -0.071, employees: 12, capital: 60_000, mission: "presentation", taxRegime: "IS_RN", vatRegime: "RN_mensuel", team: ["hugo", "camille", "yann"] },
]

const STREETS = [
  "avenue des Platanes",
  "rue de la Gare",
  "chemin du Moulin",
  "rue des Tanneurs",
  "boulevard de l'Industrie",
  "rue du Commerce",
  "allée des Tilleuls",
  "route de Lavaur",
  "rue Pasteur",
  "place du Marché",
  "impasse des Artisans",
  "rue Jean-Jaurès",
]

const DIRECTORS = [
  "Claire Fontaine",
  "Julien Estève",
  "Nadia Benali",
  "Olivier Carrère",
  "Sandrine Viguier",
  "Marc Delpech",
  "Aurélie Sabatier",
  "Romain Castagné",
  "Élodie Marty",
  "Pierre Lacoste",
  "Fatima Ouali",
  "Bruno Cazals",
  "Lucie Barthe",
  "Damien Rouquette",
  "Hélène Fabre",
]

/** Génère un SIREN fictif : 9 chiffres dont la clé de Luhn est volontairement fausse. */
function fakeSiren(seed: string) {
  const r = createRng(`siren:${seed}`)
  const digits = [r.int(3, 9), ...Array.from({ length: 7 }, () => r.int(0, 9))]
  const luhn = (ds: number[]) =>
    ds.reduce((sum, d, i) => {
      if (i % 2 === 1) {
        const x = d * 2
        return sum + (x > 9 ? x - 9 : x)
      }
      return sum + d
    }, 0)
  const partial = luhn([...digits, 0])
  const valid = (10 - (partial % 10)) % 10
  const invalid = (valid + r.int(1, 9)) % 10
  return [...digits, invalid].join("")
}

function round500(value: number) {
  return Math.max(500, Math.round(value / 500) * 500)
}

function buildThresholds(revenue: number): Thresholds {
  const signification = round500(revenue * 0.01)
  return {
    signification,
    planification: round500(signification * 0.75),
    insignifiant: Math.max(100, Math.round((signification * 0.05) / 50) * 50),
    variationPct: 0.1,
    variationAmount: round500(signification * 0.5),
  }
}

function liasseFor(taxRegime: TaxRegime): Dossier["liasse"] {
  switch (taxRegime) {
    case "IS_RN":
      return "2050"
    case "IS_RSI":
      return "2033"
    case "IR_BIC_RSI":
      return "2031"
    case "IR_RF":
      return "2072"
  }
}

/** Dossiers dont le paramétrage est volontairement incomplet (démo) */
const WITHOUT_THRESHOLDS = new Set(["ceramique-odile", "salon-epure", "cycles-randonnees"])
const WITHOUT_SHAREPOINT = new Set(["ceramique-odile", "terrasses-orme", "salon-epure", "vertigo-escalade"])
const WITHOUT_ENGAGEMENT_LETTER = new Set(["ceramique-odile", "cycles-randonnees"])
const PENNYLANE_ERROR = "transports-moreau"

function minutesAgo(minutes: number) {
  return new Date(Date.parse("2026-10-05T09:30:00+02:00") - minutes * 60_000).toISOString()
}

export const DOSSIERS: Dossier[] = SEEDS.map((s, index) => {
  const r = createRng(`dossier:${s.id}`)
  const pennylaneError = s.id === PENNYLANE_ERROR
  return {
    id: s.id,
    name: s.name,
    legalForm: s.legalForm,
    siren: fakeSiren(s.id),
    sector: s.sector,
    naf: { code: s.naf[0], label: s.naf[1] },
    address: {
      street: `${r.int(2, 48)} ${STREETS[index % STREETS.length]}`,
      zip: s.city[0],
      city: s.city[1],
    },
    director: DIRECTORS[index % DIRECTORS.length]!,
    closing: s.closing,
    mission: s.mission,
    taxRegime: s.taxRegime,
    vatRegime: s.vatRegime,
    liasse: liasseFor(s.taxRegime),
    capital: s.capital,
    employees: s.employees,
    revenue: s.revenue,
    growth: s.growth,
    team: { collaborateur: s.team[0], chefMission: s.team[1], associe: s.team[2] },
    thresholds: WITHOUT_THRESHOLDS.has(s.id) ? null : buildThresholds(s.revenue),
    pennylane: {
      companyId: 4_100_000 + r.int(10_000, 899_999),
      status: pennylaneError ? "erreur" : "connecte",
      lastSyncAt: pennylaneError ? minutesAgo(60 * 24 * 3 + 47) : minutesAgo(r.int(2, 55)),
      error: pennylaneError ? "Jeton d'accès expiré — reconnexion nécessaire" : undefined,
    },
    sharepoint: WITHOUT_SHAREPOINT.has(s.id)
      ? { status: "non_connecte", path: null, lastSyncAt: null }
      : {
          status: "connecte",
          path: `Cabinet Exemple - Dossiers clients/${s.name}`,
          lastSyncAt: minutesAgo(r.int(30, 60 * 5)),
        },
    fiscalDocsSyncAt: minutesAgo(r.int(60 * 2, 60 * 20)),
    engagementLetterSigned: !WITHOUT_ENGAGEMENT_LETTER.has(s.id),
  }
})

const byId = new Map(DOSSIERS.map((d) => [d.id, d]))

export function getDossier(id: string) {
  return byId.get(id)
}

/** Éléments de paramétrage manquants (pour la colonne « Paramétrage ») */
export function setupGaps(d: Dossier) {
  const gaps: string[] = []
  if (!d.thresholds) gaps.push("Seuils de signification")
  if (d.sharepoint.status !== "connecte") gaps.push("Dossier SharePoint")
  if (!d.engagementLetterSigned) gaps.push("Lettre de mission signée")
  if (d.pennylane.status !== "connecte") gaps.push("Connexion Pennylane")
  return gaps
}

export function dossierTeamIds(d: Dossier) {
  return [d.team.collaborateur, d.team.chefMission, d.team.associe]
}
