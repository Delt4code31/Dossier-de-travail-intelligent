import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AnalysisHeader } from "@/components/analyse/analysis-header"
import { getDossier } from "@/lib/data"

export async function generateMetadata({ params }: LayoutProps<"/analyse/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: `Analyse — ${getDossier(id)?.name ?? "dossier"}` }
}

export default async function AnalysisLayout({ children, params }: LayoutProps<"/analyse/[id]">) {
  const { id } = await params
  if (!getDossier(id)) notFound()
  return (
    <div className="flex flex-1 flex-col">
      <AnalysisHeader id={id} />
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">{children}</div>
    </div>
  )
}
