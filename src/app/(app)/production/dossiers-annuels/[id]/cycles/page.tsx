import { CyclesView } from "@/components/production/cycles-view"

export default async function CyclesPage({ params, searchParams }: PageProps<"/production/dossiers-annuels/[id]/cycles">) {
  const { id } = await params
  const { cycle } = await searchParams
  return <CyclesView id={id} target={typeof cycle === "string" ? cycle : null} />
}
