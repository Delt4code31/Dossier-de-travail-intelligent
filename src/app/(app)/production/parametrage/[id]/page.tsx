import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SetupForm } from "@/components/production/setup-form"
import { getDossier } from "@/lib/data"

export async function generateMetadata({ params }: PageProps<"/production/parametrage/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: `Paramétrage — ${getDossier(id)?.name ?? "dossier"}` }
}

export default async function SetupDossierPage({ params }: PageProps<"/production/parametrage/[id]">) {
  const { id } = await params
  if (!getDossier(id)) notFound()
  return <SetupForm id={id} />
}
