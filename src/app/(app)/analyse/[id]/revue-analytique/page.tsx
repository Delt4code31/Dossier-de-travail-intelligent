import { AnalyticReview } from "@/components/analyse/analytic-review"

export default async function AnalyticReviewPage({ params }: PageProps<"/analyse/[id]/revue-analytique">) {
  const { id } = await params
  return <AnalyticReview id={id} />
}
