/**
 * Connexion à Pennylane (API cabinet « Firm API ») — PRÉPARÉE, NON ACTIVÉE.
 *
 * Sert à alimenter les écrans avec des données structurées (balance, écritures, tiers,
 * transactions, GED). L'assistant IA, lui, passe par le MCP Pennylane (voir assistant.ts).
 *
 * Activation :
 *  1. Créer un jeton dans Pennylane › Paramètres cabinet › Firm Tokens, avec des droits
 *     en LECTURE SEULE (trial_balance:readonly, ledger…:readonly, dms:readonly, etc.).
 *  2. Le coller dans .env.local (PENNYLANE_FIRM_API_KEY) — jamais dans le code ni dans Git.
 *  3. Remplacer, dans src/lib/data, les générateurs de démo par ces fonctions
 *     (en commençant par la balance : `trialBalance` → `getFinancials`).
 *
 * À n'utiliser que côté serveur (composants serveur, routes API, synchronisation nocturne).
 * Limite Pennylane : 5 requêtes par seconde.
 */

const BASE_URL = "https://app.pennylane.com/api/external/firm/v1"

/** Réponse paginée de Pennylane (pagination par curseur) */
export interface PennylanePage<T> {
  items: T[]
  has_more: boolean
  next_cursor: string | null
}

async function call<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = process.env.PENNYLANE_FIRM_API_KEY
  if (!token) throw new Error("PENNYLANE_FIRM_API_KEY manquant (voir .env.example).")

  const url = new URL(BASE_URL + path)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      // En-tête de la migration 2026 des endpoints comptables (sans effet une fois la migration terminée)
      "X-Use-2026-API-Changes": "true",
    },
    // Données mises en cache 15 minutes : la synchronisation complète se fait la nuit
    next: { revalidate: 900 },
  })
  const body = (await res.json()) as T & { error?: string; status?: number }
  // Pennylane peut répondre 200 même en cas d'erreur d'authentification : on vérifie le contenu
  if (!res.ok || body.error || body.status === 401) {
    throw new Error(`Pennylane : erreur sur ${path} (${res.status}) ${body.error ?? ""}`.trim())
  }
  return body
}

/** Récupère toutes les pages d'une liste (curseur) */
async function all<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const items: T[] = []
  let cursor: string | undefined
  do {
    const page = await call<PennylanePage<T>>(path, { ...params, limit: 100, cursor })
    items.push(...page.items)
    cursor = page.has_more && page.next_cursor ? page.next_cursor : undefined
  } while (cursor)
  return items
}

export const pennylane = {
  /** Dossiers clients du cabinet */
  companies: () => all<{ id: number; name: string; registration_number?: string }>("/companies"),

  /** Exercices comptables d'un dossier */
  fiscalYears: (companyId: number) => call<PennylanePage<{ start: string; finish: string }>>(`/companies/${companyId}/fiscal_years`),

  /** Balance générale sur une période (dates AAAA-MM-JJ) */
  trialBalance: (companyId: number, startDate: string, endDate: string) =>
    call<unknown>(`/companies/${companyId}/trial_balance`, { start_date: startDate, end_date: endDate }),

  /** Lignes d'écritures (grand livre), avec filtre JSON optionnel */
  ledgerEntryLines: (companyId: number, filter?: object) =>
    all<unknown>(`/companies/${companyId}/ledger_entry_lines`, { filter: filter ? JSON.stringify(filter) : undefined }),

  /** Tiers */
  customers: (companyId: number) => all<unknown>(`/companies/${companyId}/customers`),
  suppliers: (companyId: number) => all<unknown>(`/companies/${companyId}/suppliers`),

  /** Transactions bancaires */
  transactions: (companyId: number) => all<unknown>(`/companies/${companyId}/transactions`),

  /** Fichiers de la GED Pennylane */
  dmsFiles: (companyId: number) => all<unknown>(`/companies/${companyId}/dms_files`),
}

/*
 * Documents fiscaux (liasses, TVA) : exposés par le MCP Pennylane (outils get_tax_returns
 * et get_vat_returns). L'endpoint REST équivalent est à confirmer dans la documentation
 * Pennylane (https://firm-pennylane.readme.io) avant de brancher l'écran « Documents ».
 */
