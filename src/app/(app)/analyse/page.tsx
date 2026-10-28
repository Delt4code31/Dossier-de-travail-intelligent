import type { Metadata } from "next"

import { AnalysisPicker } from "@/components/analyse/analysis-picker"

export const metadata: Metadata = { title: "Analyse" }

export default function AnalysisPage() {
  return <AnalysisPicker />
}
