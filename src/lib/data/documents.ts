import { DEMO_NOW } from "@/lib/format"

import { getAnnualFile } from "./annual-files"
import { computeIndicators, getFinancials } from "./balance"
import { DOSSIERS } from "./dossiers"
import { isoDate, lastClosedExercises, liasseDeadline } from "./exercises"
import { createRng } from "./rng"
import type { Dossier, FiscalDocStatus, FiscalDocument } from "./types"

/**
 * Documents fiscaux récupérés depuis Pennylane (déclarations et liasses).
 * En production : outils MCP `get_tax_returns` et `get_vat_returns`.
 */

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  )
}

function statusFor(due: string, filed: boolean): FiscalDocStatus {
  if (filed) return "depose"
  return Date.parse(due) < DEMO_NOW.getTime() ? "en_retard" : "a_deposer"
}

function buildDocuments(d: Dossier): FiscalDocument[] {
  const r = createRng(`docs:${d.id}`)
  const docs: FiscalDocument[] = []
  const file = getAnnualFile(d.id)!
  const { current, previous } = lastClosedExercises(d)
  const { lines } = getFinancials(d)
  const ind = computeIndicators(lines, "n")
  const isCompany = d.taxRegime === "IS_RN" || d.taxRegime === "IS_RSI"
  const endYear = new Date(current.end).getUTCFullYear()
  const push = (doc: Omit<FiscalDocument, "id" | "dossierId" | "sizeKb">) =>
    docs.push({ ...doc, id: `${d.id}-${docs.length}`, dossierId: d.id, sizeKb: r.int(60, 1_400) })

  // Liasse fiscale de l'exercice courant
  const liasseForm =
    d.liasse === "2050" ? "2065-SD + 2050 à 2059-G" : d.liasse === "2033" ? "2065-SD + 2033-A à G" : d.liasse === "2031" ? "2031-SD + 2033-A à G" : "2072-S-SD"
  const filed = file.status === "depose"
  push({
    type: "liasse",
    form: liasseForm,
    label: `Liasse fiscale — ${current.label.replace("Exercice ", "exercice ")}`,
    period: current.label,
    dueDate: file.dueDate,
    filedAt: file.filedAt,
    status: filed ? "depose" : Date.parse(file.dueDate) < DEMO_NOW.getTime() ? "en_retard" : "brouillon",
    amount: null,
  })
  // Liasse de l'exercice précédent
  const prevDue = liasseDeadline(previous.end)
  push({
    type: "liasse",
    form: liasseForm,
    label: `Liasse fiscale — ${previous.label.replace("Exercice ", "exercice ")}`,
    period: previous.label,
    dueDate: prevDue,
    filedAt: new Date(Date.parse(prevDue) - r.int(3, 20) * 86_400_000).toISOString(),
    status: "depose",
    amount: null,
  })

  // Impôt sur les sociétés : relevé de solde et acomptes
  if (isCompany) {
    const is = Math.max(0, lines.find((l) => l.account === "695000")?.n ?? 0)
    const end = new Date(current.end)
    // Relevé de solde : 15 mai pour une clôture au 31/12, sinon le 15 du 4e mois suivant la clôture
    const soldeDue =
      end.getUTCMonth() === 11
        ? isoDate(endYear + 1, 5, 15)
        : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 4, 15, 12)).toISOString()
    push({
      type: "is_solde",
      form: "2572-SD",
      label: "Relevé de solde d'impôt sur les sociétés",
      period: current.label,
      dueDate: soldeDue,
      filedAt: filed ? new Date(Date.parse(soldeDue) - r.int(1, 10) * 86_400_000).toISOString() : null,
      status: statusFor(soldeDue, filed),
      amount: Math.round(is * r.float(0.05, 0.3)),
    })
    // Acomptes : le 15 des 3e, 6e, 9e et 12e mois de chaque exercice
    if (is > 3_000) {
      const windowStart = DEMO_NOW.getTime() - 365 * 86_400_000
      const windowEnd = DEMO_NOW.getTime() + 75 * 86_400_000
      for (const exerciseEnd of [previous.end, current.end]) {
        const e = new Date(exerciseEnd)
        ;[3, 6, 9, 12].forEach((offset, i) => {
          const dueDate = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + offset, 15, 12))
          const due = dueDate.toISOString()
          if (dueDate.getTime() < windowStart || dueDate.getTime() > windowEnd) return
          const done = dueDate.getTime() < DEMO_NOW.getTime()
          push({
            type: "is_acompte",
            form: "2571-SD",
            label: `Acompte d'IS n° ${i + 1}`,
            period: monthLabel(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1),
            dueDate: due,
            filedAt: done ? new Date(dueDate.getTime() - r.int(0, 5) * 86_400_000).toISOString() : null,
            status: statusFor(due, done),
            amount: Math.round((is / 4) * r.jitter(0.05)),
          })
        })
      }
    }
  }

  // TVA
  if (d.vatRegime === "RN_mensuel" || d.vatRegime === "RN_trimestriel") {
    const monthly = d.vatRegime === "RN_mensuel"
    // Périodes de septembre 2025 à août 2026 (déposées)
    for (let k = 12; k >= 1; k--) {
      const ref = new Date(Date.UTC(2026, 7 - k + 1, 15))
      const y = ref.getUTCFullYear()
      const m = ref.getUTCMonth() + 1
      if (!monthly && m % 3 !== 0) continue
      const due = new Date(Date.UTC(y, m, r.int(15, 24), 12)).toISOString()
      const done = Date.parse(due) < DEMO_NOW.getTime()
      push({
        type: "tva",
        form: "3310-CA3-SD",
        label: monthly ? "Déclaration de TVA mensuelle" : "Déclaration de TVA trimestrielle",
        period: monthLabel(y, m),
        dueDate: due,
        filedAt: done ? new Date(Date.parse(due) - r.int(0, 6) * 86_400_000).toISOString() : null,
        status: statusFor(due, done),
        amount: Math.round((ind.ca / 12) * 0.2 * r.float(0.25, 0.45) * (monthly ? 1 : 3)),
      })
    }
    // Déclaration de septembre 2026, à déposer en octobre
    const due = isoDate(2026, 10, r.int(15, 24))
    push({
      type: "tva",
      form: "3310-CA3-SD",
      label: monthly ? "Déclaration de TVA mensuelle" : "Déclaration de TVA trimestrielle",
      period: monthLabel(2026, 9),
      dueDate: due,
      filedAt: null,
      status: "a_deposer",
      amount: Math.round((ind.ca / 12) * 0.2 * r.float(0.25, 0.45) * (monthly ? 1 : 3)),
    })
  } else if (d.vatRegime === "RSI") {
    const due = isoDate(2026, 5, 5)
    push({
      type: "tva",
      form: "3517-S-SD (CA12)",
      label: "Déclaration annuelle de TVA",
      period: "Année 2025",
      dueDate: due,
      filedAt: new Date(Date.parse(due) - r.int(1, 12) * 86_400_000).toISOString(),
      status: "depose",
      amount: Math.round(ind.ca * 0.2 * r.float(0.08, 0.14)),
    })
    push({
      type: "tva",
      form: "2581-SD",
      label: "Acompte semestriel de TVA (juillet)",
      period: "Juillet 2026",
      dueDate: isoDate(2026, 7, 16),
      filedAt: isoDate(2026, 7, 14),
      status: "depose",
      amount: Math.round(ind.ca * 0.2 * r.float(0.04, 0.06)),
    })
  }

  // CVAE (déclaration obligatoire au-delà de 152 500 € de CA)
  if (isCompany && ind.ca > 152_500) {
    const due = isoDate(2026, 5, 20)
    push({
      type: "cvae",
      form: "1330-CVAE-SD",
      label: "Déclaration de valeur ajoutée et des effectifs",
      period: "Année 2025",
      dueDate: due,
      filedAt: new Date(Date.parse(due) - r.int(2, 15) * 86_400_000).toISOString(),
      status: "depose",
      amount: ind.ca > 500_000 ? Math.round(ind.valeurAjoutee * 0.0019) : null,
    })
  }

  // DAS2 (honoraires versés)
  if (r.chance(0.55)) {
    const due = isoDate(2026, 5, 20)
    push({
      type: "das2",
      form: "DAS2",
      label: "Déclaration des honoraires versés",
      period: "Année 2025",
      dueDate: due,
      filedAt: new Date(Date.parse(due) - r.int(2, 15) * 86_400_000).toISOString(),
      status: "depose",
      amount: null,
    })
  }

  return docs.sort((a, b) => Date.parse(b.dueDate) - Date.parse(a.dueDate))
}

let all: FiscalDocument[] | null = null

export function getFiscalDocuments(): FiscalDocument[] {
  if (!all) all = DOSSIERS.flatMap(buildDocuments)
  return all
}
