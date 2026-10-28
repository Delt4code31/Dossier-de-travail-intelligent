import type { Metadata } from "next"

import { AccountView } from "@/components/admin/account-view"

export const metadata: Metadata = { title: "Mon compte" }

export default function AccountPage() {
  return <AccountView />
}
