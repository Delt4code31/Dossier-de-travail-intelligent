import type { Metadata } from "next"

import { PageContainer, PageHeader } from "@/components/common/page"
import { AnnualFilesList } from "@/components/production/annual-files-list"

export const metadata: Metadata = { title: "Dossiers annuels" }

export default async function AnnualFilesPage({ searchParams }: PageProps<"/production/dossiers-annuels">) {
  const { filtre, statut } = await searchParams
  return (
    <PageContainer>
      <PageHeader
        title="Dossiers annuels"
        description="Dernier exercice clos de chaque client — avancement de la révision, échéances et points ouverts. Cliquez un dossier pour l'ouvrir."
      />
      <AnnualFilesList
        key={`${filtre ?? ""}-${statut ?? ""}`}
        initialFilter={typeof filtre === "string" ? filtre : undefined}
        initialStatus={typeof statut === "string" ? statut : undefined}
      />
    </PageContainer>
  )
}
