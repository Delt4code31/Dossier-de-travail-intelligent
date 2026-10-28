import { computeIndicators, getAnnualFile, getChecks, getFinancials, getPendingItems, type Dossier } from "@/lib/data"
import { buildInsights, computeRatios, formatRatio, significantRows } from "@/lib/analysis"
import { formatEur, formatEurCompact, formatPct } from "@/lib/format"

/**
 * Assistant IA — version démo.
 *
 * En production, la question est envoyée à Claude (API Anthropic) avec le serveur MCP
 * Pennylane connecté : Claude appelle lui-même les outils (balance, grand livre,
 * factures, déclarations…) puis rédige la réponse. Voir src/lib/integrations/assistant.ts.
 * Ici, les réponses sont construites à partir des données fictives du dossier.
 */

export type AnswerBlock = { type: "p"; text: string } | { type: "ul"; items: string[] }

export interface AssistantAnswer {
  tools: string[]
  blocks: AnswerBlock[]
}

export const SUGGESTIONS = [
  "Résume la situation financière du dossier",
  "Quelles sont les variations significatives ?",
  "Prépare les questions à poser au client",
  "Rédige un commentaire de gestion pour la plaquette",
]

function summary(d: Dossier): AssistantAnswer {
  const { lines } = getFinancials(d)
  const n = computeIndicators(lines, "n")
  const n1 = computeIndicators(lines, "n1")
  const caVar = n1.ca ? (n.ca - n1.ca) / n1.ca : 0
  const insights = buildInsights(d)
  return {
    tools: ["query_trial_balance", "get_financial_report"],
    blocks: [
      {
        type: "p",
        text: `${d.name} réalise un chiffre d'affaires de ${formatEurCompact(n.ca)} (${formatPct(caVar)} par rapport à l'exercice précédent). L'excédent brut d'exploitation atteint ${formatEurCompact(n.ebe)}, soit ${n.ca ? formatPct(n.ebe / n.ca, 1, false) : "—"} du chiffre d'affaires, et le résultat net s'établit à ${formatEurCompact(n.resultatNet)} (contre ${formatEurCompact(n1.resultatNet)}).`,
      },
      {
        type: "p",
        text: `Côté bilan, les capitaux propres s'élèvent à ${formatEurCompact(n.capitauxPropres)}, les dettes financières à ${formatEurCompact(n.endettement)} et la trésorerie nette à ${formatEurCompact(n.tresorerieNette)}.`,
      },
      { type: "p", text: "Points d'attention :" },
      { type: "ul", items: insights.map((i) => `${i.title} — ${i.detail}`) },
    ],
  }
}

function variations(d: Dossier): AssistantAnswer {
  const rows = significantRows(d).slice(0, 6)
  if (rows.length === 0) {
    return {
      tools: ["query_trial_balance"],
      blocks: [{ type: "p", text: "Aucune variation ne dépasse les seuils de revue analytique du dossier. Les postes sont stables d'un exercice à l'autre." }],
    }
  }
  return {
    tools: ["query_trial_balance", "list_ledger_entry_lines"],
    blocks: [
      { type: "p", text: `${rows.length} regroupement(s) varient au-delà des seuils du dossier :` },
      {
        type: "ul",
        items: rows.map((r) => {
          const delta = r.n - r.n1
          const top = [...r.lines].sort((a, b) => Math.abs(b.n - b.n1) - Math.abs(a.n - a.n1))[0]
          return `${r.group.label} : ${formatEur(r.n1)} → ${formatEur(r.n)} (${delta >= 0 ? "+" : "−"}${formatEur(Math.abs(delta))}${r.n1 ? `, ${formatPct(delta / Math.abs(r.n1))}` : ""})${top ? ` — surtout le compte ${top.account} ${top.label.toLowerCase()}` : ""}.`
        }),
      },
      { type: "p", text: "Je peux détailler les écritures d'un compte si besoin (par exemple : « détaille le compte 6226 »)." },
    ],
  }
}

function questions(d: Dossier): AssistantAnswer {
  // Contrôles à transformer en questions (les points purement internes au cabinet sont exclus)
  const internal = new Set(["equilibre", "non_deductibles"])
  const checks = getChecks(d).filter((c) => (c.status === "anomalie" || c.status === "attention") && !internal.has(c.id))
  const file = getAnnualFile(d.id)
  const pending = file
    ? getPendingItems(file.id).filter(
        (p) => p.status !== "resolu" && p.assignee === "client" && !(p.id.endsWith("-p-attente") && checks.some((c) => c.id === "attente")),
      )
    : []
  const items = [
    ...checks.map((c) => {
      switch (c.id) {
        case "attente":
          return `Pouvez-vous nous indiquer la nature des opérations en compte d'attente (${formatEur(c.amount ?? 0, true)}) ?`
        case "clients_crediteurs":
          return "Certains clients présentent un solde créditeur : s'agit-il d'avoirs à imputer ou de doubles règlements ?"
        case "fournisseurs_debiteurs":
          return "Certains fournisseurs présentent un solde débiteur : avez-vous des avoirs à recevoir ou des factures non transmises ?"
        case "justificatifs":
          return `Merci de déposer dans Pennylane les justificatifs manquants (${c.count} transaction(s)).`
        case "tva":
          return "Le chiffre d'affaires déclaré en TVA diffère de la comptabilité : avez-vous des régularisations ou des factures annulées ?"
        case "creances_anciennes":
          return "Quelles créances clients de plus de 90 jours sont encore recouvrables ? Des relances ou procédures sont-elles en cours ?"
        case "immos_en_charges":
          return "Les achats de matériel supérieurs à 500 € HT sont-ils destinés à durer plusieurs années (immobilisation) ?"
        case "cca":
          return "Le compte courant d'associé est débiteur : merci de prévoir son remboursement avant la clôture."
        case "caisse":
          return "Le solde de caisse a été négatif certains jours : toutes les recettes en espèces ont-elles été enregistrées ?"
        case "rapprochement":
          return `Pouvez-vous nous transmettre le relevé bancaire de clôture ? Nous constatons un écart de ${formatEur(c.amount ?? 0, true)} avec la comptabilité.`
        case "decouvert":
          return `Le compte bancaire présente un découvert de ${formatEur(c.amount ?? 0)} à la clôture : disposez-vous d'une autorisation de découvert ?`
        case "doublons":
          return "Certaines factures fournisseurs semblent enregistrées deux fois (même montant, même fournisseur) : pouvez-vous confirmer ?"
        case "capitaux_propres":
          return "Les capitaux propres sont inférieurs à la moitié du capital social : une consultation des associés devra être organisée."
        default:
          return `${c.label} : ${c.summary}.`
      }
    }),
    ...pending.map((p) => p.label),
  ]
  return {
    tools: ["list_ledger_entry_lines", "list_customers", "list_suppliers", "get_vat_returns"],
    blocks: items.length
      ? [
          { type: "p", text: "Voici une proposition de questions à adresser au client, classées par priorité :" },
          { type: "ul", items: Array.from(new Set(items)) },
          { type: "p", text: "Vous pouvez les ajouter aux points en suspens du dossier annuel, puis utiliser « Copier la demande client »." },
        ]
      : [{ type: "p", text: "Les contrôles ne relèvent aucun point bloquant : aucune question prioritaire à poser au client." }],
  }
}

function managementComment(d: Dossier): AssistantAnswer {
  const { lines } = getFinancials(d)
  const n = computeIndicators(lines, "n")
  const n1 = computeIndicators(lines, "n1")
  const caVar = n1.ca ? (n.ca - n1.ca) / n1.ca : 0
  const ebeRate = n.ca ? n.ebe / n.ca : 0
  const trend = caVar >= 0.03 ? "en progression" : caVar <= -0.03 ? "en retrait" : "stable"
  return {
    tools: ["get_financial_report", "query_trial_balance"],
    blocks: [
      {
        type: "p",
        text: `Au cours de l'exercice, l'activité de la société est ${trend} avec un chiffre d'affaires de ${formatEur(n.ca)} (${formatPct(caVar)}). La valeur ajoutée s'établit à ${formatEur(n.valeurAjoutee)} et l'excédent brut d'exploitation à ${formatEur(n.ebe)}, soit ${formatPct(ebeRate, 1, false)} du chiffre d'affaires.`,
      },
      {
        type: "p",
        text: `Après prise en compte des dotations, du résultat financier et de l'impôt, l'exercice se solde par un ${n.resultatNet >= 0 ? "bénéfice" : "déficit"} de ${formatEur(Math.abs(n.resultatNet))}. Les capitaux propres atteignent ${formatEur(n.capitauxPropres)} à la clôture.`,
      },
      { type: "p", text: "Texte proposé à relire et adapter avant intégration dans la plaquette." },
    ],
  }
}

function freeText(d: Dossier, q: string): AssistantAnswer {
  const s = q.toLowerCase()
  const ratios = computeRatios(d)
  const { lines } = getFinancials(d)
  const n = computeIndicators(lines, "n")
  const n1 = computeIndicators(lines, "n1")
  if (/(trésor|tresor|banque|cash)/.test(s)) {
    return {
      tools: ["query_trial_balance", "list_transactions"],
      blocks: [
        { type: "p", text: `La trésorerie nette s'élève à ${formatEur(n.tresorerieNette)} à la clôture, contre ${formatEur(n1.tresorerieNette)} sur l'exercice précédent.` },
        { type: "p", text: `Le besoin en fonds de roulement est de ${formatEur(n.bfr)} et la capacité d'autofinancement de ${formatEur(n.caf)}.` },
      ],
    }
  }
  if (/(client|créance|creance|délai|delai|recouvr)/.test(s)) {
    const dso = ratios.find((r) => r.id === "dso")!
    return {
      tools: ["list_customer_invoices", "query_trial_balance"],
      blocks: [{ type: "p", text: `Le délai moyen de paiement clients est de ${formatRatio(dso.n, "jours")} (contre ${formatRatio(dso.n1, "jours")}). Les créances clients s'élèvent à ${formatEur(n.clients)}.` }],
    }
  }
  if (/(tva)/.test(s)) {
    const tva = getChecks(d).find((c) => c.id === "tva")!
    return { tools: ["get_vat_returns", "query_trial_balance"], blocks: [{ type: "p", text: tva.summary + "." }, { type: "p", text: tva.description }] }
  }
  if (/(résultat|resultat|rentab|marge|ebe)/.test(s)) return summary(d)
  if (/(question|client|demande)/.test(s)) return questions(d)
  return {
    tools: [],
    blocks: [
      { type: "p", text: "En démonstration, je réponds aux questions suggérées et aux thèmes trésorerie, clients, TVA et rentabilité." },
      { type: "p", text: "Une fois branché à Pennylane, l'assistant pourra répondre à toute question sur le dossier en interrogeant directement la comptabilité (balance, grand livre, factures, déclarations), en citant ses sources." },
    ],
  }
}

export function answer(d: Dossier, question: string): AssistantAnswer {
  switch (question) {
    case SUGGESTIONS[0]:
      return summary(d)
    case SUGGESTIONS[1]:
      return variations(d)
    case SUGGESTIONS[2]:
      return questions(d)
    case SUGGESTIONS[3]:
      return managementComment(d)
    default:
      return freeText(d, question)
  }
}
