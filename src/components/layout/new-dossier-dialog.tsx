"use client"

import { useState } from "react"
import { toast } from "sonner"

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
import { MISSIONS, USERS } from "@/lib/data"

const missionItems = Object.entries(MISSIONS).map(([value, label]) => ({ value, label }))
const collaboratorItems = USERS.filter((u) => u.role === "collaborateur").map((u) => ({
  value: u.id,
  label: `${u.firstName} ${u.lastName}`,
}))

/** Création d'un dossier client (démo : rien n'est enregistré). */
export function NewDossierDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [siren, setSiren] = useState("")
  const [mission, setMission] = useState<string | null>("presentation")
  const [collab, setCollab] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onOpenChange(false)
    toast.success(`Dossier « ${name || "Nouveau dossier"} » préparé`, {
      description:
        "Démo : en production, l'outil retrouve la société dans Pennylane grâce au SIREN et crée sa fiche de paramétrage.",
    })
    setName("")
    setSiren("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nouveau dossier client</DialogTitle>
            <DialogDescription>
              Le dossier sera relié à la société Pennylane portant le même SIREN.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="nd-name">Raison sociale</FieldLabel>
              <Input id="nd-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SAS EXEMPLE" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="nd-siren">SIREN</FieldLabel>
              <Input
                id="nd-siren"
                value={siren}
                onChange={(e) => setSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="9 chiffres"
                inputMode="numeric"
                className="font-mono"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Mission</FieldLabel>
                <Select items={missionItems} value={mission} onValueChange={(v) => setMission(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {missionItems.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Collaborateur</FieldLabel>
                <Select items={collaboratorItems} value={collab} onValueChange={(v) => setCollab(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {collaboratorItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer le dossier</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
