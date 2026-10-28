/**
 * Assistant IA — branchement PRÉPARÉ, NON ACTIVÉ (la démo utilise src/lib/assistant.ts).
 *
 * Principe : la question est envoyée à Claude (API Anthropic) avec le serveur MCP de
 * Pennylane connecté. Claude choisit lui-même les outils à appeler (balance, grand livre,
 * factures, déclarations…), lit les réponses et rédige sa réponse.
 *
 * Sécurité : seuls les outils de LECTURE sont autorisés (liste blanche ci-dessous) ;
 * l'assistant ne peut donc pas modifier la comptabilité.
 *
 * Activation : renseigner ANTHROPIC_API_KEY, PENNYLANE_MCP_URL et PENNYLANE_MCP_TOKEN dans
 * .env.local (voir .env.example), puis faire appeler `askAssistant` par l'écran Assistant
 * (via la route src/app/api/assistant/route.ts).
 *
 * À n'utiliser que côté serveur : les clés ne doivent jamais arriver dans le navigateur.
 */

import Anthropic from "@anthropic-ai/sdk"

/** Outils MCP Pennylane autorisés (lecture seule) */
const READ_ONLY_TOOLS = [
  "get_context",
  "list_companies",
  "get_company",
  "query_trial_balance",
  "get_financial_report",
  "list_ledger_entry_lines",
  "get_ledger_account",
  "list_accounts",
  "get_journal",
  "get_entry",
  "list_customers",
  "list_suppliers",
  "list_customer_invoices",
  "list_supplier_invoices",
  "list_transactions",
  "get_tax_returns",
  "get_vat_returns",
  "list_firm_file",
]

const SYSTEM_PROMPT = `Tu es l'assistant d'analyse du cabinet d'expertise comptable Audit CPA.
Tu réponds à des collaborateurs comptables sur un dossier client précis, à partir des données Pennylane.
- Interroge Pennylane avant de répondre ; ne devine jamais un montant.
- Réponds en français, de façon concise, avec les montants en euros et l'exercice concerné.
- Cite les comptes ou documents sur lesquels tu t'appuies.
- Si une information manque dans Pennylane, dis-le et propose la question à poser au client.`

export interface AssistantRequest {
  question: string
  /** Identifiant Pennylane de la société analysée */
  companyId: number
  companyName: string
  exerciseLabel: string
}

export async function askAssistant({ question, companyId, companyName, exerciseLabel }: AssistantRequest) {
  const mcpUrl = process.env.PENNYLANE_MCP_URL
  if (!process.env.ANTHROPIC_API_KEY || !mcpUrl) {
    throw new Error("Assistant non configuré : ANTHROPIC_API_KEY et PENNYLANE_MCP_URL sont requis (voir .env.example).")
  }

  const client = new Anthropic()
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // MCP Pennylane + repli automatique sur un autre modèle en cas de refus de sécurité
    betas: ["mcp-client-2025-11-20", "server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    mcp_servers: [
      {
        type: "url",
        url: mcpUrl,
        name: "pennylane",
        authorization_token: process.env.PENNYLANE_MCP_TOKEN ?? null,
      },
    ],
    tools: [
      {
        type: "mcp_toolset",
        mcp_server_name: "pennylane",
        // Liste blanche : tout est désactivé, sauf les outils de lecture
        default_config: { enabled: false },
        configs: Object.fromEntries(READ_ONLY_TOOLS.map((name) => [name, { enabled: true }])),
      },
    ],
    messages: [
      {
        role: "user",
        content: `Dossier : ${companyName} (société Pennylane n° ${companyId}), ${exerciseLabel}.\n\nQuestion : ${question}`,
      },
    ],
  })

  if (response.stop_reason === "refusal") {
    return { text: "La question n'a pas pu être traitée. Reformulez-la ou contactez l'administrateur.", toolsUsed: [] as string[] }
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n")
  const toolsUsed = response.content.flatMap((block) => (block.type === "mcp_tool_use" ? [block.name] : []))
  return { text, toolsUsed }
}
