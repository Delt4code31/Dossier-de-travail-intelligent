"use client"

import { toast } from "sonner"

import { UserAvatar } from "@/components/common/bits"
import { InfoRow, PageContainer, PageHeader, Panel } from "@/components/common/page"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CURRENT_USER_ID, ROLES, TEAMS, getUser } from "@/lib/data"

/** Réglages personnels (roue crantée de l'en-tête, comme dans Fiscalis). */
export function AccountView() {
  const me = getUser(CURRENT_USER_ID)!
  const prefs = [
    { id: "p1", label: "Résumé quotidien par e-mail", hint: "Échéances, dossiers en retard et alertes de mes dossiers", on: true },
    { id: "p2", label: "Notification quand un dossier passe en revue", hint: "Pour les dossiers dont je suis chef de mission ou associé", on: true },
    { id: "p3", label: "Notification des nouvelles anomalies", hint: "Détectées lors de la synchronisation nocturne", on: false },
  ]
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Mon compte" description="Vos informations et vos préférences de notification." />
      <Panel>
        <div className="flex items-center gap-4 p-4">
          <UserAvatar userId={me.id} size="default" className="size-12" />
          <div>
            <div className="text-base font-semibold">
              {me.firstName} {me.lastName}
            </div>
            <div className="text-sm text-muted-foreground">{me.title}</div>
          </div>
        </div>
        <dl className="divide-y border-t px-4 py-1">
          <InfoRow label="E-mail">{me.email}</InfoRow>
          <InfoRow label="Rôle">{ROLES[me.role].label}</InfoRow>
          <InfoRow label="Équipe">{TEAMS[me.team]}</InfoRow>
          <InfoRow label="Connexion">Compte Microsoft 365 du cabinet</InfoRow>
        </dl>
      </Panel>
      <Panel title="Notifications">
        <div className="divide-y">
          {prefs.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <Label htmlFor={p.id}>{p.label}</Label>
                <p className="text-xs text-muted-foreground">{p.hint}</p>
              </div>
              <Switch id={p.id} defaultChecked={p.on} onCheckedChange={() => toast.success("Préférence enregistrée")} />
            </div>
          ))}
        </div>
      </Panel>
    </PageContainer>
  )
}
