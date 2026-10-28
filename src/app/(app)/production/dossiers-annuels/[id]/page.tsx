import { AnnualFileSynthese } from "@/components/production/annual-file-synthese"

export default async function AnnualFilePage({ params }: PageProps<"/production/dossiers-annuels/[id]">) {
  const { id } = await params
  return <AnnualFileSynthese id={id} />
}
