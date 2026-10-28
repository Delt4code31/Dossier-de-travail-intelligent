import { formatEur, formatPct } from "@/lib/format"

import { computeIndicators, getFinancials, sumAccounts } from "./balance"
import { lastClosedExercises } from "./exercises"
import { createRng } from "./rng"
import { isFinalized } from "./scenario"
import type { AutoCheck, CheckDetail, Dossier } from "./types"

/**
 * Contrôles automatiques réalisés sur les données comptables du dossier.
 * En production : calculés à partir des outils MCP Pennylane indiqués dans `source`.
 */

const CUSTOMERS = [
  "SARL Dupré Bâtiment",
  "M. et Mme Leroy",
  "Clinique des Roses",
  "Mairie de Saint-Sulpice",
  "SAS Horizon Conseil",
  "EURL Atelier Sud",
  "Association Les Coteaux",
  "SCI du Parc",
  "SAS Méridienne",
  "Mme Garcia",
]

const SUPPLIERS = [
  "Elec Distribution Sud",
  "Bois & Matériaux d'Occitanie",
  "Télécom Pro Services",
  "Mutuelle Assurances du Midi",
  "Transports Rapides 31",
  "Bureau & Papeterie Plus",
  "Garage du Lauragais",
  "Nettoyage Express",
  "Logiciels Gestion PME",
  "Imprimerie des Remparts",
]

const SUSPENSE_LABELS = [
  "Virement reçu non identifié",
  "Prélèvement à affecter",
  "Remise de chèques à ventiler",
  "Paiement CB sans justificatif",
  "Virement émis — bénéficiaire inconnu",
]

function splitAmount(total: number, parts: number, r: ReturnType<typeof createRng>) {
  const weights = Array.from({ length: parts }, () => r.float(0.3, 1))
  const sum = weights.reduce((s, w) => s + w, 0)
  let allocated = 0
  return weights.map((w, i) => {
    const v = i === parts - 1 ? Math.round((total - allocated) * 100) / 100 : Math.round(((total * w) / sum) * 100) / 100
    allocated += v
    return v
  })
}

function dateInLastMonth(endIso: string, r: ReturnType<typeof createRng>) {
  const end = new Date(endIso).getTime()
  return new Date(end - r.int(0, 60) * 86_400_000).toISOString()
}

const cache = new Map<string, AutoCheck[]>()

export function getChecks(d: Dossier): AutoCheck[] {
  const cached = cache.get(d.id)
  if (cached) return cached

  const r = createRng(`checks:${d.id}`)
  const { lines } = getFinancials(d)
  const { current } = lastClosedExercises(d)
  const ind = computeIndicators(lines, "n")
  const s = (...prefixes: string[]) => sumAccounts(lines, prefixes, "n")
  const insignifiant = d.thresholds?.insignifiant ?? 250
  // Dossier révisé : les anomalies courantes ont été corrigées avant le dépôt
  const finalized = isFinalized(d.id)
  const ifOpen = (value: number) => (finalized ? 0 : value)
  const checks: AutoCheck[] = []

  // 1. Équilibre de la balance
  const totalDebit = lines.filter((l) => l.n > 0).reduce((t, l) => t + l.n, 0)
  checks.push({
    id: "equilibre",
    label: "Équilibre de la balance",
    cycle: "—",
    description: "Le total des soldes débiteurs doit être égal au total des soldes créditeurs.",
    status: "ok",
    summary: `Balance équilibrée — ${formatEur(totalDebit)} au débit comme au crédit`,
    details: [],
    source: "query_trial_balance",
  })

  // 2. Comptes d'attente
  const suspense = s("471", "472")
  if (Math.abs(suspense) > 0) {
    const parts = r.int(2, 4)
    const amounts = splitAmount(suspense, parts, r)
    checks.push({
      id: "attente",
      label: "Comptes d'attente soldés à la clôture",
      cycle: "K",
      description: "Les comptes 471 / 472 doivent être soldés : chaque opération doit être affectée au bon compte.",
      status: Math.abs(suspense) >= insignifiant ? "anomalie" : "attention",
      summary: `${formatEur(suspense, true)} non affectés en compte d'attente`,
      amount: suspense,
      count: parts,
      details: amounts.map((amount, i) => ({
        account: "471000",
        label: SUSPENSE_LABELS[(i + r.int(0, 4)) % SUSPENSE_LABELS.length]!,
        amount,
        date: dateInLastMonth(current.end, r),
      })),
      source: "list_ledger_entry_lines",
    })
  } else {
    checks.push({
      id: "attente",
      label: "Comptes d'attente soldés à la clôture",
      cycle: "K",
      description: "Les comptes 471 / 472 doivent être soldés : chaque opération doit être affectée au bon compte.",
      status: "ok",
      summary: "Aucun solde en compte d'attente",
      details: [],
      source: "list_ledger_entry_lines",
    })
  }

  // 3. Clients créditeurs
  const creditCustomers = s("411") > 0 ? ifOpen(r.pick([0, 0, 1, 1, 2, 3])) : 0
  const customerDetails: CheckDetail[] = r
    .shuffle(CUSTOMERS)
    .slice(0, creditCustomers)
    .map((name) => ({
      account: `411${name.replace(/[^A-Z]/gi, "").slice(0, 5).toUpperCase()}`,
      label: name,
      amount: -Math.round(r.float(180, 4_800) * 100) / 100,
      note: r.pick(["Avoir non imputé", "Double règlement", "Acompte reçu non lettré"]),
    }))
  checks.push({
    id: "clients_crediteurs",
    label: "Clients créditeurs",
    cycle: "C",
    description: "Un compte client créditeur signale un avoir non imputé, un double paiement ou un acompte non lettré.",
    status: creditCustomers ? "attention" : "ok",
    summary: creditCustomers
      ? `${creditCustomers} compte${creditCustomers > 1 ? "s" : ""} client${creditCustomers > 1 ? "s" : ""} créditeur${creditCustomers > 1 ? "s" : ""} (${formatEur(customerDetails.reduce((t, c) => t + (c.amount ?? 0), 0))})`
      : "Aucun compte client créditeur",
    amount: customerDetails.reduce((t, c) => t + (c.amount ?? 0), 0) || undefined,
    count: creditCustomers || undefined,
    details: customerDetails,
    source: "list_customers",
  })

  // 4. Fournisseurs débiteurs
  const debitSuppliers = ifOpen(r.pick([0, 0, 0, 1, 1, 2]))
  const supplierDetails: CheckDetail[] = r
    .shuffle(SUPPLIERS)
    .slice(0, debitSuppliers)
    .map((name) => ({
      account: `401${name.replace(/[^A-Z]/gi, "").slice(0, 5).toUpperCase()}`,
      label: name,
      amount: Math.round(r.float(120, 3_600) * 100) / 100,
      note: r.pick(["Avoir à recevoir", "Acompte versé non lettré", "Facture non saisie"]),
    }))
  checks.push({
    id: "fournisseurs_debiteurs",
    label: "Fournisseurs débiteurs",
    cycle: "B",
    description: "Un compte fournisseur débiteur signale un avoir à recevoir, un acompte ou une facture manquante.",
    status: debitSuppliers ? "attention" : "ok",
    summary: debitSuppliers
      ? `${debitSuppliers} compte${debitSuppliers > 1 ? "s" : ""} fournisseur${debitSuppliers > 1 ? "s" : ""} débiteur${debitSuppliers > 1 ? "s" : ""}`
      : "Aucun compte fournisseur débiteur",
    amount: supplierDetails.reduce((t, c) => t + (c.amount ?? 0), 0) || undefined,
    count: debitSuppliers || undefined,
    details: supplierDetails,
    source: "list_suppliers",
  })

  // 5. Caisse
  const hasCash = lines.some((l) => l.account.startsWith("53"))
  const negativeCash = hasCash && !finalized && (d.sector === "restauration" ? r.chance(0.6) : r.chance(0.15))
  checks.push({
    id: "caisse",
    label: "Caisse jamais créditrice",
    cycle: "A",
    description: "Le solde de caisse ne peut pas être négatif en cours d'exercice (indice de recettes non enregistrées).",
    status: !hasCash ? "na" : negativeCash ? "anomalie" : "ok",
    summary: !hasCash
      ? "Pas de caisse dans ce dossier"
      : negativeCash
        ? "Solde créditeur constaté sur 2 journées"
        : "Solde de caisse toujours positif",
    details: negativeCash
      ? [
          { account: "530000", label: "Solde au soir", amount: -Math.round(r.float(40, 650) * 100) / 100, date: dateInLastMonth(current.end, r) },
          { account: "530000", label: "Solde au soir", amount: -Math.round(r.float(20, 300) * 100) / 100, date: dateInLastMonth(current.end, r) },
        ]
      : [],
    source: "list_ledger_entry_lines",
  })

  // 6. Rapprochement bancaire
  const bankGap = ifOpen(r.chance(0.3) ? Math.round(r.float(35, 2_400) * 100) / 100 : 0)
  checks.push({
    id: "rapprochement",
    label: "Rapprochement bancaire",
    cycle: "A",
    description: "Le solde comptable du 512 doit correspondre au relevé bancaire, aux suspens près.",
    status: bankGap ? "attention" : "ok",
    summary: bankGap
      ? `Écart de ${formatEur(bankGap, true)} entre la comptabilité et le relevé`
      : "Solde comptable = relevé bancaire",
    amount: bankGap || undefined,
    details: bankGap
      ? [{ account: "512000", label: "Opération au relevé non comptabilisée", amount: bankGap, date: current.end }]
      : [],
    source: "list_transactions",
  })

  // 7. Écritures sans justificatif
  const missing = ifOpen(r.pick([0, 1, 2, 3, 4, 6, 9, 13]))
  checks.push({
    id: "justificatifs",
    label: "Écritures sans pièce justificative",
    cycle: "B",
    description: "Transactions bancaires rapprochées sans facture ou reçu attaché dans Pennylane.",
    status: missing === 0 ? "ok" : missing >= 8 ? "anomalie" : "attention",
    summary: missing === 0 ? "Toutes les écritures ont un justificatif" : `${missing} transaction${missing > 1 ? "s" : ""} sans justificatif`,
    count: missing || undefined,
    details: Array.from({ length: Math.min(missing, 6) }, () => ({
      account: r.pick(["606300", "625100", "622600", "615000", "628800"]),
      label: r.pick(["Paiement CB", "Prélèvement", "Virement émis"]) + " — " + r.pick(SUPPLIERS),
      amount: Math.round(r.float(25, 1_900) * 100) / 100,
      date: dateInLastMonth(current.end, r),
    })),
    source: "list_transactions",
  })

  // 8. Doublons potentiels
  const duplicates = ifOpen(r.pick([0, 0, 0, 1, 2]))
  checks.push({
    id: "doublons",
    label: "Doublons potentiels de factures fournisseurs",
    cycle: "B",
    description: "Même fournisseur, même montant, dates proches : risque de double enregistrement.",
    status: duplicates ? "attention" : "ok",
    summary: duplicates ? `${duplicates} paire${duplicates > 1 ? "s" : ""} de factures suspecte${duplicates > 1 ? "s" : ""}` : "Aucun doublon détecté",
    count: duplicates || undefined,
    details: Array.from({ length: duplicates }, () => {
      const amount = Math.round(r.float(90, 2_800) * 100) / 100
      return {
        account: "401000",
        label: `${r.pick(SUPPLIERS)} — 2 factures de ${formatEur(amount, true)}`,
        amount,
        date: dateInLastMonth(current.end, r),
      }
    }),
    source: "list_supplier_invoices",
  })

  // 9. Cohérence TVA
  if (d.vatRegime === "exonere") {
    checks.push({
      id: "tva",
      label: "CA comptable / CA déclaré en TVA",
      cycle: "G",
      description: "Le chiffre d'affaires comptabilisé doit correspondre au chiffre d'affaires déclaré sur les déclarations de TVA.",
      status: "na",
      summary: "Dossier exonéré de TVA",
      details: [],
      source: "get_vat_returns",
    })
  } else {
    const gap = r.chance(0.45) && !finalized ? r.float(-0.045, -0.011) : r.float(-0.006, 0.004)
    const declared = Math.round(ind.ca * (1 + gap))
    checks.push({
      id: "tva",
      label: "CA comptable / CA déclaré en TVA",
      cycle: "G",
      description: "Le chiffre d'affaires comptabilisé doit correspondre au chiffre d'affaires déclaré sur les déclarations de TVA.",
      status: Math.abs(gap) > 0.03 ? "anomalie" : Math.abs(gap) > 0.01 ? "attention" : "ok",
      summary:
        Math.abs(gap) > 0.01
          ? `Écart de ${formatPct(-gap)} (${formatEur(ind.ca - declared)}) entre CA comptable et CA déclaré`
          : "CA déclaré cohérent avec la comptabilité",
      amount: ind.ca - declared,
      details: [
        { label: "CA comptable (comptes 70)", amount: ind.ca },
        { label: "CA déclaré (cumul des déclarations)", amount: declared },
      ],
      source: "get_vat_returns",
    })
  }

  // 10. Compte courant d'associé débiteur
  const cca = s("455")
  checks.push({
    id: "cca",
    label: "Comptes courants d'associés non débiteurs",
    cycle: "K",
    description:
      "Un compte courant débiteur d'un associé personne physique est interdit en SARL et SA (art. L223-21 et L225-43 du Code de commerce).",
    status: cca > 0 ? "anomalie" : "ok",
    summary: cca > 0 ? `Compte courant débiteur de ${formatEur(cca)}` : cca < 0 ? `Compte courant créditeur de ${formatEur(-cca)}` : "Pas de compte courant",
    amount: cca > 0 ? cca : undefined,
    details: cca > 0 ? [{ account: "455000", label: `Associé — ${d.director}`, amount: cca }] : [],
    source: "query_trial_balance",
  })

  // 11. Petits matériels en charges
  const smallAssets = ifOpen(r.pick([0, 1, 1, 2, 3]))
  checks.push({
    id: "immos_en_charges",
    label: "Achats > 500 € HT passés en charges",
    cycle: "E",
    description: "Les biens durables de plus de 500 € HT doivent en principe être immobilisés.",
    status: smallAssets ? "attention" : "ok",
    summary: smallAssets ? `${smallAssets} achat${smallAssets > 1 ? "s" : ""} à examiner` : "Aucun achat significatif en charges",
    count: smallAssets || undefined,
    details: Array.from({ length: smallAssets }, () => ({
      account: r.pick(["606300", "615000"]),
      label: r.pick(["Ordinateur portable", "Écran et station d'accueil", "Perceuse-visseuse pro", "Climatiseur mobile", "Machine à café pro", "Mobilier de bureau"]),
      amount: Math.round(r.float(520, 2_300) * 100) / 100,
      date: dateInLastMonth(current.end, r),
    })),
    source: "list_ledger_entry_lines",
  })

  // 12. Créances anciennes
  const receivables = s("411", "416")
  const oldReceivables = receivables > 0 && r.chance(finalized ? 0.15 : 0.6) ? Math.round(receivables * r.float(0.04, 0.22)) : 0
  const threshold = d.thresholds?.planification ?? 5_000
  checks.push({
    id: "creances_anciennes",
    label: "Créances clients de plus de 90 jours",
    cycle: "C",
    description: "Les créances échues depuis plus de 90 jours doivent être relancées et, le cas échéant, dépréciées.",
    status: oldReceivables === 0 ? "ok" : oldReceivables > threshold ? "anomalie" : "attention",
    summary: oldReceivables ? `${formatEur(oldReceivables)} échus depuis plus de 90 jours` : "Pas de créance ancienne significative",
    amount: oldReceivables || undefined,
    details: oldReceivables
      ? splitAmount(oldReceivables, Math.min(3, r.int(1, 3)), r).map((amount) => ({
          account: "411000",
          label: r.pick(CUSTOMERS),
          amount,
          note: `${r.int(95, 320)} jours`,
        }))
      : [],
    source: "list_customer_invoices",
  })

  // 13. Capitaux propres / capital social
  const halfCapital = d.capital / 2
  checks.push({
    id: "capitaux_propres",
    label: "Capitaux propres ≥ moitié du capital social",
    cycle: "H",
    description:
      "Si les capitaux propres deviennent inférieurs à la moitié du capital, les associés doivent statuer dans les 4 mois (art. L223-42 / L225-248).",
    status: ind.capitauxPropres < halfCapital ? "anomalie" : "ok",
    summary: `Capitaux propres : ${formatEur(ind.capitauxPropres)} pour un capital de ${formatEur(d.capital)}`,
    amount: ind.capitauxPropres,
    details: [],
    source: "get_financial_report",
  })

  // 14. Charges non déductibles
  const fines = s("6712")
  checks.push({
    id: "non_deductibles",
    label: "Charges non déductibles à réintégrer",
    cycle: "G",
    description: "Pénalités et amendes (6712) à réintégrer extra-comptablement sur la liasse (2058-A, ligne WJ).",
    status: fines > 0 ? "attention" : "ok",
    summary: fines > 0 ? `${formatEur(fines)} de pénalités et amendes à réintégrer` : "Aucune pénalité ou amende comptabilisée",
    amount: fines || undefined,
    details: fines > 0 ? [{ account: "671200", label: "Pénalités, amendes fiscales et pénales", amount: fines }] : [],
    source: "query_trial_balance",
  })

  // 15. Découvert bancaire
  const overdraft = -s("519")
  checks.push({
    id: "decouvert",
    label: "Concours bancaires et découverts",
    cycle: "J",
    description: "Un découvert récurrent révèle une tension de trésorerie à documenter dans la note de synthèse.",
    status: overdraft > 0 ? "attention" : "ok",
    summary: overdraft > 0 ? `${formatEur(overdraft)} de concours bancaires à la clôture` : "Aucun découvert à la clôture",
    amount: overdraft || undefined,
    details: [],
    source: "query_trial_balance",
  })

  cache.set(d.id, checks)
  return checks
}

export function checkCounts(checks: AutoCheck[]) {
  return {
    anomalie: checks.filter((c) => c.status === "anomalie").length,
    attention: checks.filter((c) => c.status === "attention").length,
    ok: checks.filter((c) => c.status === "ok").length,
    na: checks.filter((c) => c.status === "na").length,
  }
}
