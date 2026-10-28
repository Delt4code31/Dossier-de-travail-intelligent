/**
 * Contrôle des données de démonstration : balances équilibrées, indicateurs plausibles,
 * statuts de production, contrôles automatiques.
 * Lancer : npx tsx --tsconfig tsconfig.json scripts/check-data.ts
 */
import { DOSSIERS, getFinancials, computeIndicators, getChecks, ANNUAL_FILES, fileProgress, getFiscalDocuments, getGed, getPendingItems, checkCounts } from "../src/lib/data"
import { formatEurCompact, formatPct } from "../src/lib/format"

let issues = 0
for (const d of DOSSIERS) {
  const f = getFinancials(d)
  const sumN = f.lines.reduce((s, l) => s + l.n, 0)
  const sumN1 = f.lines.reduce((s, l) => s + l.n1, 0)
  const n = computeIndicators(f.lines, "n")
  const n1 = computeIndicators(f.lines, "n1")
  const af = ANNUAL_FILES.find((a) => a.id === d.id)!
  const prog = fileProgress(af.cycles)
  const cc = checkCounts(getChecks(d))
  const bank = f.lines.find((l) => l.account === "512000")
  // continuity: CP N (hors résultat) = CP N-1 hors résultat + RN N-1 - distributions -> check CP N (hors résultat) <= CP N-1 + RN N-1
  const cpHorsResN = n.capitauxPropres - n.resultatNet
  const cpHorsResN1 = n1.capitauxPropres - n1.resultatNet
  const flag = (Math.abs(sumN) > 2 || Math.abs(sumN1) > 2) ? " <<< DESEQUILIBRE" : ""
  if (flag) issues++
  console.log(
    `${d.id.padEnd(22)} CA ${formatEurCompact(n.ca).padStart(9)} (${formatPct(n.ca / n1.ca - 1)}) | EBE ${formatPct(n.ebe / n.ca, 1, false).padStart(7)} | REX ${formatPct(n.resultatExploitation / n.ca, 1, false).padStart(7)} | RN ${formatEurCompact(n.resultatNet).padStart(9)} / N-1 ${formatEurCompact(n1.resultatNet).padStart(9)} | CP ${formatEurCompact(n.capitauxPropres).padStart(9)} (hors rés N ${formatEurCompact(cpHorsResN)} vs N-1+RN1 ${formatEurCompact(cpHorsResN1 + n1.resultatNet)}) | Banque ${formatEurCompact(bank?.n ?? 0).padStart(9)} | BFR ${formatEurCompact(n.bfr).padStart(9)} | ${af.status} ${prog.pct}% | checks A${cc.anomalie}/W${cc.attention} | pend ${getPendingItems(af.id).length}${flag}`,
  )
}
console.log("Docs fiscaux:", getFiscalDocuments().length, "| GED altimetre:", JSON.stringify(Object.keys(getGed("altimetre-studio")!)))
console.log("Issues:", issues)
