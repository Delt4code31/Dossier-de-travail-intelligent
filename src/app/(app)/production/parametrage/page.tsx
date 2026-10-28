import type { Metadata } from "next"

import { PageContainer, PageHeader } from "@/components/common/page"
import { SetupList } from "@/components/production/setup-list"

export const metadata: Metadata = { title: "Paramétrage" }

export default function SetupPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Paramétrage"
        description="Fiche de chaque dossier : mission, équipe, seuils et liaisons Pennylane / SharePoint. Cliquez un dossier pour le paramétrer."
      />
      <SetupList />
    </PageContainer>
  )
}
