"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Check, Minus, UserPlus } from "lucide-react"

import { UserAvatar } from "@/components/common/bits"
import { PageContainer, PageHeader } from "@/components/common/page"
import { ToneBadge } from "@/components/common/status"
import { FilterChip, SearchInput, normalizeSearch } from "@/components/common/table-tools"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ANNUAL_FILES,
  DOSSIERS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  TEAMS,
  USERS,
  dossierTeamIds,
  type RoleId,
  type TeamId,
} from "@/lib/data"
import { formatRelative } from "@/lib/format"

const roleItems = (Object.entries(ROLES) as [RoleId, { label: string }][]).map(([value, r]) => ({ value, label: r.label }))
const teamItems = (Object.entries(TEAMS) as [TeamId, string][]).map(([value, label]) => ({ value, label }))

export function UsersView() {
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<"tous" | RoleId>("tous")
  const [inviting, setInviting] = useState(false)

  const rows = useMemo(
    () =>
      USERS.map((u) => {
        const dossiers = DOSSIERS.filter((d) => dossierTeamIds(d).includes(u.id))
        const active = ANNUAL_FILES.filter((f) => dossiers.some((d) => d.id === f.dossierId) && f.status !== "depose").length
        return { u, dossiers: dossiers.length, active }
      }),
    [],
  )
  const filtered = rows.filter(({ u }) => {
    const q = normalizeSearch(query.trim())
    if (q && !normalizeSearch(`${u.firstName} ${u.lastName} ${u.email}`).includes(q)) return false
    if (role !== "tous" && u.role !== role) return false
    return true
  })

  return (
    <PageContainer>
      <PageHeader
        title="Utilisateurs"
        description="Collaborateurs du cabinet ayant accès à l'outil, leur rôle et leur portefeuille de dossiers."
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus data-icon="inline-start" />
            Inviter un utilisateur
          </Button>
        }
      />

      <Tabs defaultValue="utilisateurs">
        <TabsList variant="line">
          <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="roles">Rôles et droits</TabsTrigger>
        </TabsList>

        <TabsContent value="utilisateurs" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Rechercher (nom, e-mail)…" />
            <FilterChip active={role === "tous"} onClick={() => setRole("tous")} label="Tous" count={USERS.length} />
            {roleItems.map((r) => (
              <FilterChip key={r.value} active={role === r.value} onClick={() => setRole(r.value)} label={r.label} count={USERS.filter((u) => u.role === r.value).length} />
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden lg:table-cell">E-mail</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden md:table-cell">Équipe</TableHead>
                <TableHead className="text-right">Dossiers</TableHead>
                <TableHead className="text-right">En production</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden xl:table-cell">Dernière connexion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ u, dossiers, active }) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <UserAvatar userId={u.id} size="default" />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="block text-xs text-muted-foreground">{u.title}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{u.email}</TableCell>
                  <TableCell className="text-sm">{ROLES[u.role].label}</TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{TEAMS[u.team]}</TableCell>
                  <TableCell className="text-right tabular-nums">{dossiers}</TableCell>
                  <TableCell className="text-right tabular-nums">{active}</TableCell>
                  <TableCell>
                    {u.status === "actif" ? <ToneBadge tone="success">Actif</ToneBadge> : <ToneBadge tone="warning">Invitation envoyée</ToneBadge>}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    {u.lastLoginAt ? formatRelative(u.lastLoginAt) : "jamais"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            La connexion se fait avec le compte Microsoft 365 du cabinet. Les droits dépendent du rôle ; le portefeuille, de l&apos;équipe affectée
            à chaque dossier (Production › Paramétrage).
          </p>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%]">Droit</TableHead>
                {roleItems.map((r) => (
                  <TableHead key={r.value} className="text-center">
                    {r.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{p.label}</TableCell>
                  {roleItems.map((r) => (
                    <TableCell key={r.value} className="text-center">
                      {ROLE_PERMISSIONS[r.value].includes(p.id) ? (
                        <Check className="mx-auto size-4 text-emerald-600" aria-label="Oui" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Non" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {roleItems.map((r) => (
              <div key={r.value} className="rounded-xl border px-4 py-3">
                <div className="text-sm font-semibold">{r.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{ROLES[r.value].description}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </PageContainer>
  )
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<RoleId>("collaborateur")
  const [team, setTeam] = useState<TeamId>("pme")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onOpenChange(false)
            toast.success("Invitation préparée", { description: `Démo : aucun e-mail n'est envoyé. En production, ${email || "la personne"} recevra un lien de connexion Microsoft 365.` })
            setEmail("")
          }}
        >
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
            <DialogDescription>La personne se connectera avec son compte Microsoft 365 du cabinet.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="inv-email">Adresse e-mail professionnelle</FieldLabel>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@audit-cpa.com" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Rôle</FieldLabel>
                <Select items={roleItems} value={role} onValueChange={(v) => setRole(v as RoleId)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleItems.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Équipe</FieldLabel>
                <Select items={teamItems} value={team} onValueChange={(v) => setTeam(v as TeamId)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teamItems.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">Envoyer l&apos;invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
