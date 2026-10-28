import type { Metadata } from "next"

import { SupervisionView } from "@/components/production/supervision-view"

export const metadata: Metadata = { title: "Supervision" }

export default function SupervisionPage() {
  return <SupervisionView />
}
