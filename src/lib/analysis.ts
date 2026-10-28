import {
  computeIndicators,
  getChecks,
  getFinancials,
  groupRows,
  sumAccounts,
  type Dossier,
  type GroupRow,
  type Indicators,
} from "@/lib/data"
import { formatEur, formatEurCompact, formatNumber, formatPct } from "@/lib/format"

/**
 * Calculs d'analyse financière partagés par la synthèse, la revue analytique
 * et l'assistant IA (version démo, à partir de la balance N / N-1).
 */

export interface Ratio {
  id: string
  label: string
  n: number | null
  n1: number | null
  unit: "jours" | "%" | "x"
  /** Une hausse est-elle favorable ? */
  favorable: "up" | "down"
  help: string
}

export function computeRatios(d: Dossier): Ratio[] {
  const { lines } = getFinancials(d)
  const ratiosFor = (key: "n" | "n1", ind: Indicators) => {
    const chargesExt = sumAccounts(lines, ["604", "605", "606", "61", "62"], key)
    return {
      dso: ind.ca > 0 ? (ind.clients / (ind.ca * 1.2)) * 365 : null,
      dpo: ind.achatsConsommes + chargesExt > 0 ? (ind.fournisseurs / ((ind.achatsConsommes + chargesExt) * 1.2)) * 365 : null,
      stock: ind.stocks > 0 && ind.achatsConsommes > 0 ? (ind.stocks / ind.achatsConsommes) * 365 : null,
      ebe: ind.ca > 0 ? ind.ebe / ind.ca : null,
      salaires: ind.ca > 0 ? ind.masseSalariale / ind.ca : null,
      autonomie: ind.totalBilan > 0 ? ind.capitauxPropres / ind.totalBilan : null,
      gearing: ind.capitauxPropres > 0 ? ind.endettement / ind.capitauxPropres : null,
    }
  }
  const n = ratiosFor("n", computeIndicators(lines, "n"))
  const n1 = ratiosFor("n1", computeIndicators(lines, "n1"))
  return [
    { id: "dso", label: "Délai de paiement clients", n: n.dso, n1: n1.dso, unit: "jours", favorable: "down", help: "Créances clients TTC / CA TTC × 365" },
    { id: "dpo", label: "Délai de paiement fournisseurs", n: n.dpo, n1: n1.dpo, unit: "jours", favorable: "up", help: "Dettes fournisseurs TTC / achats et charges externes TTC × 365" },
    { id: "stock", label: "Rotation des stocks", n: n.stock, n1: n1.stock, unit: "jours", favorable: "down", help: "Stock / achats consommés × 365" },
    { id: "ebe", label: "Taux d'EBE", n: n.ebe, n1: n1.ebe, unit: "%", favorable: "up", help: "Excédent brut d'exploitation / chiffre d'affaires" },
    { id: "salaires", label: "Poids de la masse salariale", n: n.salaires, n1: n1.salaires, unit: "%", favorable: "down", help: "Salaires et charges sociales / chiffre d'affaires" },
    { id: "autonomie", label: "Autonomie financière", n: n.autonomie, n1: n1.autonomie, unit: "%", favorable: "up", help: "Capitaux propres / total du bilan" },
    { id: "gearing", label: "Endettement / capitaux propres", n: n.gearing, n1: n1.gearing, unit: "x", favorable: "down", help: "Dettes financières / capitaux propres" },
  ]
}

export function formatRatio(value: number | null, unit: Ratio["unit"]) {
  if (value === null || !Number.isFinite(value)) return "—"
  if (unit === "jours") return `${formatNumber(Math.round(value))} j`
  if (unit === "%") return formatPct(value, 1, false)
  return `${formatNumber(value, 2)} ×`
}

/** Variation significative au sens des seuils du dossier */
export function isSignificant(row: { n: number; n1: number }, d: Dossier) {
  const pct = d.thresholds?.variationPct ?? 0.1
  const amount = d.thresholds?.variationAmount ?? Math.max(1_000, Math.round(d.revenue * 0.005))
  const delta = row.n - row.n1
  const rel = row.n1 !== 0 ? Math.abs(delta / row.n1) : row.n !== 0 ? 1 : 0
  return Math.abs(delta) >= amount && rel >= pct
}

export function significantRows(d: Dossier): GroupRow[] {
  const { lines } = getFinancials(d)
  return groupRows(lines)
    .filter((r) => isSignificant(r, d))
    .sort((a, b) => Math.abs(b.n - b.n1) - Math.abs(a.n - a.n1))
}

export interface Insight {
  tone: "positive" | "negative" | "neutral"
  title: string
  detail: string
}

/** Points d'attention rédigés automatiquement (règles simples, version démo de l'IA) */
export function buildInsights(d: Dossier): Insight[] {
  const { lines } = getFinancials(d)
  const n = computeIndicators(lines, "n")
  const n1 = computeIndicators(lines, "n1")
  const ratios = computeRatios(d)
  const insights: Insight[] = []
  const caVar = n1.ca ? (n.ca - n1.ca) / n1.ca : 0

  if (caVar >= 0.1) insights.push({ tone: "positive", title: `Chiffre d'affaires en hausse de ${formatPct(caVar)}`, detail: `${formatEurCompact(n.ca)} contre ${formatEurCompact(n1.ca)} sur l'exercice précédent.` })
  else if (caVar <= -0.05) insights.push({ tone: "negative", title: `Chiffre d'affaires en baisse de ${formatPct(caVar)}`, detail: `${formatEurCompact(n.ca)} contre ${formatEurCompact(n1.ca)}. À commenter avec le dirigeant (perte de clients, prix, activité ?).` })

  const ebe = ratios.find((r) => r.id === "ebe")!
  if (ebe.n !== null && ebe.n1 !== null && ebe.n - ebe.n1 <= -0.02) {
    insights.push({ tone: "negative", title: "Rentabilité d'exploitation en recul", detail: `Le taux d'EBE passe de ${formatRatio(ebe.n1, "%")} à ${formatRatio(ebe.n, "%")}.` })
  } else if (ebe.n !== null && ebe.n1 !== null && ebe.n - ebe.n1 >= 0.02) {
    insights.push({ tone: "positive", title: "Rentabilité d'exploitation en amélioration", detail: `Le taux d'EBE passe de ${formatRatio(ebe.n1, "%")} à ${formatRatio(ebe.n, "%")}.` })
  }

  const dso = ratios.find((r) => r.id === "dso")!
  if (dso.n !== null && dso.n1 !== null && dso.n - dso.n1 >= 7) {
    insights.push({ tone: "negative", title: "Allongement du délai de paiement clients", detail: `${formatRatio(dso.n, "jours")} contre ${formatRatio(dso.n1, "jours")} : vérifier les créances anciennes et la dépréciation.` })
  }

  if (n.resultatNet < 0) {
    insights.push({ tone: "negative", title: "Exercice déficitaire", detail: `Perte de ${formatEur(-n.resultatNet)}. Vérifier la continuité d'exploitation et les capitaux propres.` })
  }
  if (n.capitauxPropres < d.capital / 2) {
    insights.push({ tone: "negative", title: "Capitaux propres inférieurs à la moitié du capital", detail: "Consultation des associés obligatoire dans les 4 mois suivant l'approbation des comptes." })
  }
  if (n1.tresorerieNette > 0 && n.tresorerieNette < n1.tresorerieNette * 0.6) {
    insights.push({ tone: "negative", title: "Trésorerie nette en forte baisse", detail: `${formatEurCompact(n.tresorerieNette)} contre ${formatEurCompact(n1.tresorerieNette)}.` })
  }

  for (const c of getChecks(d).filter((c) => c.status === "anomalie").slice(0, 3)) {
    insights.push({ tone: "negative", title: c.label, detail: c.summary })
  }

  if (insights.length === 0) {
    insights.push({ tone: "neutral", title: "Aucun point d'attention majeur", detail: "Les indicateurs sont stables et les contrôles automatiques ne relèvent pas d'anomalie." })
  }
  return insights.slice(0, 6)
}
