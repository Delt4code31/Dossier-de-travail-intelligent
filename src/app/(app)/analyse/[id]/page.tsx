import { AnalysisSynthese } from "@/components/analyse/analysis-synthese"

export default async function AnalysisSynthesePage({ params }: PageProps<"/analyse/[id]">) {
  const { id } = await params
  return <AnalysisSynthese id={id} />
}
