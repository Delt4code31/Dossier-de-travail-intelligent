import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AnnualFileHeader } from "@/components/production/annual-file-header"
import { getDossier } from "@/lib/data"

export async function generateMetadata({ params }: LayoutProps<"/production/dossiers-annuels/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: getDossier(id)?.name ?? "Dossier annuel" }
}

export default async function AnnualFileLayout({ children, params }: LayoutProps<"/production/dossiers-annuels/[id]">) {
  const { id } = await params
  if (!getDossier(id)) notFound()
  return (
    <div className="flex flex-1 flex-col">
      <AnnualFileHeader id={id} />
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">{children}</div>
    </div>
  )
}
