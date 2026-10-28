import { NextResponse } from "next/server"

import { getDossier, lastClosedExercises } from "@/lib/data"
import { askAssistant } from "@/lib/integrations/assistant"

/**
 * Route serveur de l'assistant IA (Claude + MCP Pennylane).
 * Répond 503 tant que la connexion n'est pas configurée : l'écran utilise alors la démo.
 * ⚠️ Avant une mise en ligne : protéger cette route par l'authentification Microsoft du cabinet.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.PENNYLANE_MCP_URL) {
    return NextResponse.json({ error: "Assistant en mode démo : connexion non configurée." }, { status: 503 })
  }
  const { dossierId, question } = (await request.json()) as { dossierId?: string; question?: string }
  const dossier = dossierId ? getDossier(dossierId) : undefined
  if (!dossier || !question?.trim()) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  }
  try {
    const result = await askAssistant({
      question,
      companyId: dossier.pennylane.companyId,
      companyName: dossier.name,
      exerciseLabel: lastClosedExercises(dossier).current.label,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
