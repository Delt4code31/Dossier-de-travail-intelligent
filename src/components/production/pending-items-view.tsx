"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ClipboardCopy, Plus } from "lucide-react"

import { UserAvatar } from "@/components/common/bits"
import { FilterChip } from "@/components/common/table-tools"
import { ToneBadge } from "@/components/common/status"
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
import { Textarea } from "@/components/ui/textarea"
import {
  CURRENT_USER_ID,
  CYCLES,
  PENDING_STATUS,
  userName,
  type PendingItem,
  type PendingStatus,
} from "@/lib/data"
import { DEMO_NOW, formatDate } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"

const KIND: Record<PendingItem["kind"], { label: string; tone: "info" | "warning" | "neutral" }> = {
  question: { label: "Question", tone: "info" },
  document: { label: "Document", tone: "warning" },
  technique: { label: "Point technique", tone: "neutral" },
}

const statusItems = (Object.entries(PENDING_STATUS) as [PendingStatus, string][]).map(([value, label]) => ({ value, label }))

type Filter = "actifs" | PendingStatus | "tous"

export function PendingItemsView({ id }: { id: string }) {
  const file = useAnnualFile(id)!
  const setStatus = useDemoStore((s) => s.setPendingStatus)
  const [filter, setFilter] = useState<Filter>("actifs")
  const [adding, setAdding] = useState(false)

  const items = file.pending.filter((p) =>
    filter === "tous" ? true : filter === "actifs" ? p.status !== "resolu" : p.status === filter,
  )
  const count = (f: Filter) =>
    file.pending.filter((p) => (f === "tous" ? true : f === "actifs" ? p.status !== "resolu" : p.status === f)).length

  async function copyForClient() {
    const open = file.pending.filter((p) => p.status !== "resolu" && p.assignee === "client")
    const text = [
      `Bonjour,`,
      ``,
      `Dans le cadre de l'arrêté des comptes de l'${file.exercise.label.toLowerCase()} de ${file.dossier.name}, pourriez-vous nous transmettre les éléments suivants :`,
      ``,
      ...open.map((p) => `- ${p.label}`),
      ``,
      `Nous restons à votre disposition.`,
      `Bien cordialement,`,
    ].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${open.length} point(s) copiés`, { description: "Le texte est prêt à être collé dans un mail au client." })
    } catch {
      toast.error("Copie impossible dans ce navigateur")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === "actifs"} onClick={() => setFilter("actifs")} label="À traiter" count={count("actifs")} />
        <FilterChip active={filter === "ouvert"} onClick={() => setFilter("ouvert")} label="Ouverts" count={count("ouvert")} />
        <FilterChip active={filter === "relance"} onClick={() => setFilter("relance")} label="Relancés" count={count("relance")} />
        <FilterChip active={filter === "resolu"} onClick={() => setFilter("resolu")} label="Résolus" count={count("resolu")} />
        <FilterChip active={filter === "tous"} onClick={() => setFilter("tous")} label="Tous" count={count("tous")} />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={copyForClient} disabled={!file.pending.some((p) => p.status !== "resolu" && p.assignee === "client")}>
            <ClipboardCopy data-icon="inline-start" />
            Copier la demande client
          </Button>
          <Button onClick={() => setAdding(true)} disabled={file.status === "depose"}>
            <Plus data-icon="inline-start" />
            Ajouter un point
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Point</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Destinataire</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="w-36">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="max-w-[28rem] whitespace-normal">
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">par {userName(p.createdBy)}</div>
              </TableCell>
              <TableCell>
                <ToneBadge tone={KIND[p.kind].tone}>{KIND[p.kind].label}</ToneBadge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.cycle ? `${p.cycle} — ${CYCLES.find((c) => c.code === p.cycle)?.name}` : "—"}
              </TableCell>
              <TableCell>
                {p.assignee === "client" ? (
                  <span className="text-sm">Client</span>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    <UserAvatar userId={p.assignee} />
                    {userName(p.assignee)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm tabular-nums">{formatDate(p.createdAt)}</TableCell>
              <TableCell>
                <Select items={statusItems} value={p.status} onValueChange={(v) => setStatus(p.id, v as PendingStatus)} disabled={file.status === "depose"}>
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusItems.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                Aucun point dans cette catégorie.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AddPendingDialog open={adding} onOpenChange={setAdding} fileId={file.id} collaborator={file.dossier.team.collaborateur} />
    </div>
  )
}

const kindItems = (Object.entries(KIND) as [PendingItem["kind"], { label: string }][]).map(([value, k]) => ({ value, label: k.label }))
const cycleItems = [{ value: "aucun", label: "Aucun" }, ...CYCLES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))]

function AddPendingDialog({
  open,
  onOpenChange,
  fileId,
  collaborator,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  fileId: string
  collaborator: string
}) {
  const addPending = useDemoStore((s) => s.addPending)
  const [label, setLabel] = useState("")
  const [kind, setKind] = useState<PendingItem["kind"]>("question")
  const [cycle, setCycle] = useState("aucun")
  const [assignee, setAssignee] = useState("client")
  const assigneeItems = [
    { value: "client", label: "Client" },
    { value: collaborator, label: userName(collaborator) },
    { value: CURRENT_USER_ID, label: `${userName(CURRENT_USER_ID)} (moi)` },
  ]

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    addPending({
      id: `${fileId}-new-${Date.now()}`,
      annualFileId: fileId,
      kind,
      cycle: cycle === "aucun" ? null : cycle,
      label: label.trim(),
      status: "ouvert",
      createdAt: DEMO_NOW.toISOString(),
      createdBy: CURRENT_USER_ID,
      assignee,
    })
    toast.success("Point en suspens ajouté")
    setLabel("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nouveau point en suspens</DialogTitle>
            <DialogDescription>Question au client, document manquant ou point technique à traiter.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="pi-label">Intitulé</FieldLabel>
              <Textarea id="pi-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. : Transmettre le contrat de prêt signé en mars" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select items={kindItems} value={kind} onValueChange={(v) => setKind(v as PendingItem["kind"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {kindItems.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Cycle</FieldLabel>
                <Select items={cycleItems} value={cycle} onValueChange={(v) => setCycle(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cycleItems.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Destinataire</FieldLabel>
                <Select items={assigneeItems} value={assignee} onValueChange={(v) => setAssignee(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assigneeItems.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
