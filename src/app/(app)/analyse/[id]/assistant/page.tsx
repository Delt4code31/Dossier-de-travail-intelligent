import { AssistantView } from "@/components/analyse/assistant-view"

export default async function AssistantPage({ params }: PageProps<"/analyse/[id]/assistant">) {
  const { id } = await params
  return <AssistantView id={id} />
}
