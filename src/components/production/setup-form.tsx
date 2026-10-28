"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowUpRight, ChevronLeft, Link2, RefreshCw, Sparkles } from "lucide-react"

import { InfoRow, PageContainer, Panel } from "@/components/common/page"
import { SyncStatus } from "@/components/common/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  MISSIONS,
  SECTORS,
  TAX_REGIMES,
  USERS,
  VAT_REGIMES,
  lastClosedExercises,
  setupGaps,
  type Dossier,
  type MissionType,
  type TaxRegime,
  type Thresholds,
  type VatRegime,
} from "@/lib/data"
import { DEMO_NOW, formatDate, formatEur, formatNumber } from "@/lib/format"
import { useDossier } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"

const toItems = <T extends string>(rec: Record<T, string>) =>
  (Object.entries(rec) as [T, string][]).map(([value, label]) => ({ value, label }))

const userItems = (roles: string[]) =>
  USERS.filter((u) => roles.includes(u.role)).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

function SelectField<T extends string>({
  label,
  value,
  onChange,
  items,
  description,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string }[]
  description?: string
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select items={items} value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

function suggestThresholds(revenue: number): Thresholds {
  const r = (v: number) => Math.max(500, Math.round(v / 500) * 500)
  const signification = r(revenue * 0.01)
  return {
    signification,
    planification: r(signification * 0.75),
    insignifiant: Math.max(100, Math.round((signification * 0.05) / 50) * 50),
    variationPct: 0.1,
    variationAmount: r(signification * 0.5),
  }
}

export function SetupForm({ id }: { id: string }) {
  const dossier = useDossier(id)!
  const editDossier = useDemoStore((s) => s.editDossier)
  const recordSync = useDemoStore((s) => s.recordSync)
  const syncedAt = useDemoStore((s) => s.syncs[`pennylane:${id}`])
  const [form, setForm] = useState<Dossier>(dossier)
  const [syncing, setSyncing] = useState(false)
  const set = <K extends keyof Dossier>(key: K, value: Dossier[K]) => setForm((f) => ({ ...f, [key]: value }))
  const thresholds = form.thresholds
  const exercise = lastClosedExercises(dossier).current
  const gaps = setupGaps(form)

  function save() {
    editDossier(id, {
      mission: form.mission,
      taxRegime: form.taxRegime,
      vatRegime: form.vatRegime,
      team: form.team,
      thresholds: form.thresholds,
      engagementLetterSigned: form.engagementLetterSigned,
      sharepoint: form.sharepoint,
    })
    toast.success("Paramétrage enregistré", {
      description: gaps.length ? `Reste à compléter : ${gaps.join(", ")}.` : "Le dossier est entièrement paramétré.",
    })
  }

  function sync() {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      recordSync(`pennylane:${id}`, DEMO_NOW.toISOString())
      toast.success("Synchronisation Pennylane terminée", { description: "Balance, grand livre et factures à jour (démo)." })
    }, 1400)
  }

  const setThreshold = (key: keyof Thresholds, value: number) =>
    set("thresholds", { ...(thresholds ?? suggestThresholds(dossier.revenue)), [key]: value })

  return (
    <PageContainer>
      <div>
        <Link href="/production/parametrage" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" />
          Paramétrage
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{dossier.name}</h1>
              <Badge variant="outline" className="font-mono">
                {dossier.siren}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {dossier.address.street}, {dossier.address.zip} {dossier.address.city}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/production/dossiers-annuels/${id}`} />}>
              Dossier annuel
            </Button>
            <Button onClick={save}>Enregistrer</Button>
          </div>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Paramétrage incomplet :</span> {gaps.join(" · ")}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Panel title="Exercice et mission">
            <FieldGroup className="grid gap-4 p-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Dernier exercice clos</FieldLabel>
                <Input value={`${formatDate(exercise.start)} → ${formatDate(exercise.end)}`} readOnly className="bg-muted/40" />
                <FieldDescription>Repris de Pennylane</FieldDescription>
              </Field>
              <SelectField<MissionType> label="Type de mission" value={form.mission} onChange={(v) => set("mission", v)} items={toItems(MISSIONS)} />
              <SelectField<TaxRegime> label="Régime fiscal" value={form.taxRegime} onChange={(v) => set("taxRegime", v)} items={toItems(TAX_REGIMES)} />
              <SelectField<VatRegime> label="Régime de TVA" value={form.vatRegime} onChange={(v) => set("vatRegime", v)} items={toItems(VAT_REGIMES)} />
              <Field orientation="horizontal" className="sm:col-span-2">
                <Switch checked={form.engagementLetterSigned} onCheckedChange={(v) => set("engagementLetterSigned", v)} id="lm" />
                <FieldLabel htmlFor="lm" className="font-normal">
                  Lettre de mission signée pour l&apos;exercice
                </FieldLabel>
              </Field>
            </FieldGroup>
          </Panel>

          <Panel title="Équipe">
            <FieldGroup className="grid gap-4 p-4 sm:grid-cols-3">
              <SelectField label="Collaborateur" value={form.team.collaborateur} onChange={(v) => set("team", { ...form.team, collaborateur: v })} items={userItems(["collaborateur", "chef_mission"])} />
              <SelectField label="Chef de mission" value={form.team.chefMission} onChange={(v) => set("team", { ...form.team, chefMission: v })} items={userItems(["chef_mission", "expert_comptable"])} />
              <SelectField label="Associé signataire" value={form.team.associe} onChange={(v) => set("team", { ...form.team, associe: v })} items={userItems(["expert_comptable", "admin"])} />
            </FieldGroup>
          </Panel>

          <Panel
            title="Seuils"
            description="Utilisés par la revue analytique et les contrôles automatiques"
            action={
              <Button variant="outline" size="sm" onClick={() => set("thresholds", suggestThresholds(dossier.revenue))}>
                <Sparkles data-icon="inline-start" />
                Proposer des seuils
              </Button>
            }
          >
            {thresholds ? (
              <FieldGroup className="grid gap-4 p-4 sm:grid-cols-3">
                {(
                  [
                    ["signification", "Seuil de signification (€)", "≈ 1 % du chiffre d'affaires"],
                    ["planification", "Seuil de planification (€)", "≈ 75 % du seuil de signification"],
                    ["insignifiant", "Anomalies insignifiantes (€)", "En dessous : non reportées"],
                  ] as const
                ).map(([key, label, hint]) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={`th-${key}`}>{label}</FieldLabel>
                    <Input
                      id={`th-${key}`}
                      inputMode="numeric"
                      className="tabular-nums"
                      value={formatNumber(thresholds[key])}
                      onChange={(e) => setThreshold(key, Number(e.target.value.replace(/\D/g, "")) || 0)}
                    />
                    <FieldDescription>{hint}</FieldDescription>
                  </Field>
                ))}
                <Field>
                  <FieldLabel htmlFor="th-pct">Variation significative (%)</FieldLabel>
                  <Input
                    id="th-pct"
                    inputMode="numeric"
                    value={Math.round(thresholds.variationPct * 100)}
                    onChange={(e) => setThreshold("variationPct", (Number(e.target.value.replace(/\D/g, "")) || 0) / 100)}
                  />
                  <FieldDescription>Revue analytique N / N-1</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="th-amt">… et au moins (€)</FieldLabel>
                  <Input
                    id="th-amt"
                    inputMode="numeric"
                    className="tabular-nums"
                    value={formatNumber(thresholds.variationAmount)}
                    onChange={(e) => setThreshold("variationAmount", Number(e.target.value.replace(/\D/g, "")) || 0)}
                  />
                </Field>
              </FieldGroup>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
                Aucun seuil défini pour ce dossier.
                <Button size="sm" onClick={() => set("thresholds", suggestThresholds(dossier.revenue))}>
                  Définir les seuils
                </Button>
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Identité" description="Données issues de Pennylane et de l'INSEE">
            <dl className="divide-y px-4 py-1">
              <InfoRow label="Forme juridique">{dossier.legalForm}</InfoRow>
              <InfoRow label="Activité">
                <span className="font-mono text-xs">{dossier.naf.code}</span> {dossier.naf.label}
              </InfoRow>
              <InfoRow label="Secteur">{SECTORS[dossier.sector]}</InfoRow>
              <InfoRow label="Dirigeant">{dossier.director}</InfoRow>
              <InfoRow label="Capital social">{formatEur(dossier.capital)}</InfoRow>
              <InfoRow label="Effectif">{dossier.employees} salarié(s)</InfoRow>
              <InfoRow label="Liasse">{dossier.liasse}</InfoRow>
            </dl>
          </Panel>

          <Panel title="Connexions">
            <ul className="divide-y">
              <li className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Pennylane</span>
                  <SyncStatus
                    status={dossier.pennylane.status}
                    at={syncedAt ?? dossier.pennylane.lastSyncAt}
                    label={dossier.pennylane.status === "erreur" && !syncedAt ? "jeton expiré" : undefined}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Société n° <span className="font-mono">{dossier.pennylane.companyId}</span>
                  {dossier.pennylane.error && !syncedAt && <span className="block text-red-600">{dossier.pennylane.error}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
                    <RefreshCw data-icon="inline-start" className={syncing ? "animate-spin" : undefined} />
                    {dossier.pennylane.status === "erreur" && !syncedAt ? "Reconnecter" : "Synchroniser"}
                  </Button>
                  <Button variant="ghost" size="sm" nativeButton={false} render={<a href="https://app.pennylane.com/" target="_blank" rel="noreferrer" />}>
                    Ouvrir
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                </div>
              </li>
              <li className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">SharePoint</span>
                  <SyncStatus status={form.sharepoint.status} at={form.sharepoint.lastSyncAt} />
                </div>
                {form.sharepoint.path ? (
                  <div className="truncate text-xs text-muted-foreground" title={form.sharepoint.path}>
                    {form.sharepoint.path}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("sharepoint", {
                        status: "connecte",
                        path: `Cabinet Exemple - Dossiers clients/${dossier.name}`,
                        lastSyncAt: DEMO_NOW.toISOString(),
                      })
                    }
                  >
                    <Link2 data-icon="inline-start" />
                    Lier le dossier SharePoint
                  </Button>
                )}
              </li>
              <li className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Fiscalis</div>
                  <div className="text-xs text-muted-foreground">Messagerie et attestations impots.gouv</div>
                </div>
                <Button variant="ghost" size="sm" nativeButton={false} render={<a href="https://fiscalis.audit-cpa.net/" target="_blank" rel="noreferrer" />}>
                  Ouvrir
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </PageContainer>
  )
}
