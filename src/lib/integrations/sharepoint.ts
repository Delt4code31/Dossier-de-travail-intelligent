/**
 * Connexion à SharePoint (Microsoft Graph) — PRÉPARÉE, NON ACTIVÉE.
 *
 * Sert à afficher, dans la GED, les dossiers de travail rangés sur le site SharePoint
 * du cabinet (dossier permanent, exercices, correspondance).
 *
 * Activation (à faire avec l'informatique du groupe) :
 *  1. Créer une « inscription d'application » dans Microsoft Entra ID, avec la permission
 *     Microsoft Graph « Sites.Selected » (accès limité au seul site des dossiers clients).
 *  2. Renseigner AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET et SHAREPOINT_SITE_ID
 *     dans .env.local (voir .env.example).
 *
 * À n'utiliser que côté serveur.
 */

const GRAPH = "https://graph.microsoft.com/v1.0"

let cachedToken: { value: string; expiresAt: number } | null = null

async function graphToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error("Connexion SharePoint non configurée (voir .env.example).")
  }
  const res = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  })
  if (!res.ok) throw new Error(`Microsoft Entra ID : authentification refusée (${res.status})`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

export interface SharePointItem {
  id: string
  name: string
  size?: number
  lastModifiedDateTime: string
  lastModifiedBy?: { user?: { displayName?: string } }
  folder?: { childCount: number }
  file?: { mimeType: string }
  webUrl: string
}

/** Contenu d'un dossier du site (chemin relatif à la bibliothèque de documents) */
export async function listFolder(path: string): Promise<SharePointItem[]> {
  const siteId = process.env.SHAREPOINT_SITE_ID
  if (!siteId) throw new Error("SHAREPOINT_SITE_ID manquant (voir .env.example).")
  const token = await graphToken()
  const encoded = path.split("/").map(encodeURIComponent).join("/")
  const res = await fetch(`${GRAPH}/sites/${siteId}/drive/root:/${encoded}:/children?$top=200`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 900 },
  })
  if (!res.ok) throw new Error(`SharePoint : impossible de lire « ${path} » (${res.status})`)
  const data = (await res.json()) as { value: SharePointItem[] }
  return data.value
}
