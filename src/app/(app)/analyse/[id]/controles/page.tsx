import { ChecksView } from "@/components/analyse/checks-view"

export default async function ChecksPage({ params }: PageProps<"/analyse/[id]/controles">) {
  const { id } = await params
  return <ChecksView id={id} />
}
