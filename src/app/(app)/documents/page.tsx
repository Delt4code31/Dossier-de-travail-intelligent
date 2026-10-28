import type { Metadata } from "next"

import { DocumentsView } from "@/components/documents/documents-view"

export const metadata: Metadata = { title: "Documents fiscaux" }

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const { d } = await searchParams
  return <DocumentsView dossierParam={typeof d === "string" ? d : undefined} />
}
