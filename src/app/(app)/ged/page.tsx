import type { Metadata } from "next"

import { GedView } from "@/components/ged/ged-view"

export const metadata: Metadata = { title: "GED" }

export default async function GedPage({ searchParams }: PageProps<"/ged">) {
  const { d } = await searchParams
  const dossierParam = typeof d === "string" ? d : undefined
  // La clé remet l'explorateur à la racine quand on change de dossier
  return <GedView key={dossierParam ?? "defaut"} dossierParam={dossierParam} />
}
