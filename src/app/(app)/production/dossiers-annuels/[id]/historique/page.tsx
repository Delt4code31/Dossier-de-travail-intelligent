import { HistoryView } from "@/components/production/history-view"

export default async function HistoryPage({ params }: PageProps<"/production/dossiers-annuels/[id]/historique">) {
  const { id } = await params
  return <HistoryView id={id} />
}
