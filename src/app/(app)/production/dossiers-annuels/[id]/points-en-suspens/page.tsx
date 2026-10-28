import { PendingItemsView } from "@/components/production/pending-items-view"

export default async function PendingPage({ params }: PageProps<"/production/dossiers-annuels/[id]/points-en-suspens">) {
  const { id } = await params
  return <PendingItemsView id={id} />
}
