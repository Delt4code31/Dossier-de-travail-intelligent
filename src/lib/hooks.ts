"use client"

import { useMemo, useSyncExternalStore } from "react"

import {
  ANNUAL_FILES,
  DOSSIERS,
  checkCounts,
  fileProgress,
  getAnnualFile,
  getChecks,
  getDossier,
  getPendingItems,
  type AnnualFile,
  type AnnualStatus,
  type CycleProgress,
  type Dossier,
  type PendingItem,
} from "@/lib/data"
import { DEMO_NOW, daysUntil } from "@/lib/format"
import { useDemoStore } from "@/lib/store"

const noopSubscribe = () => () => {}

/** Vrai une fois la page affichée dans le navigateur (évite les écarts serveur/navigateur). */
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

export function useDossiers(): Dossier[] {
  const edits = useDemoStore((s) => s.dossierEdits)
  return useMemo(() => DOSSIERS.map((d) => ({ ...d, ...edits[d.id] })), [edits])
}

export function useDossier(id: string): Dossier | undefined {
  const edits = useDemoStore((s) => s.dossierEdits[id])
  return useMemo(() => {
    const d = getDossier(id)
    return d ? { ...d, ...edits } : undefined
  }, [id, edits])
}

export interface AnnualFileView extends AnnualFile {
  dossier: Dossier
  progress: ReturnType<typeof fileProgress>
  anomalies: number
  warnings: number
  pending: PendingItem[]
  openPending: number
  daysLeft: number
  late: boolean
}

type StoreSlice = Pick<
  ReturnType<typeof useDemoStore.getState>,
  | "controls"
  | "reviews"
  | "cycleComments"
  | "statusOverrides"
  | "pendingAdded"
  | "pendingStatus"
  | "dossierEdits"
>

function mergeCycles(file: AnnualFile, s: StoreSlice): CycleProgress[] {
  return file.cycles.map((c) => {
    const controls = { ...c.controls }
    for (const id of Object.keys(controls)) {
      const override = s.controls[`${file.id}:${id}`]
      if (override) controls[id] = override
    }
    const key = `${file.id}:${c.code}`
    const review = key in s.reviews ? s.reviews[key] : undefined
    const complete = Object.values(controls).every((st) => st !== "todo")
    let reviewedBy = review === undefined ? c.reviewedBy : (review?.by ?? null)
    let reviewedAt = review === undefined ? c.reviewedAt : (review?.at ?? null)
    if (!complete) {
      reviewedBy = null
      reviewedAt = null
    }
    const touched = Object.keys(controls).some((id) => s.controls[`${file.id}:${id}`])
    return {
      ...c,
      controls,
      preparedBy: complete ? c.preparedBy : null,
      preparedAt: complete ? (c.preparedAt ?? (touched ? DEMO_NOW.toISOString() : null)) : null,
      reviewedBy,
      reviewedAt,
      comment: s.cycleComments[key] ?? c.comment,
    }
  })
}

function deriveStatus(base: AnnualStatus, pct: number, override?: AnnualStatus): AnnualStatus {
  if (override) return override
  if (base === "non_demarre" && pct > 0) return "en_cours"
  return base
}

function buildView(file: AnnualFile, s: StoreSlice): AnnualFileView {
  const base = getDossier(file.dossierId)!
  const dossier = { ...base, ...s.dossierEdits[base.id] }
  const cycles = mergeCycles(file, s).map((c) => ({
    ...c,
    preparedBy: c.preparedAt ? (c.preparedBy ?? dossier.team.collaborateur) : null,
  }))
  const progress = fileProgress(cycles)
  const status = deriveStatus(file.status, progress.pct, s.statusOverrides[file.id])
  const counts = checkCounts(getChecks(base))
  const pending = [
    ...s.pendingAdded.filter((p) => p.annualFileId === file.id),
    ...getPendingItems(file.id),
  ].map((p) => ({ ...p, status: s.pendingStatus[p.id] ?? p.status }))
  const daysLeft = daysUntil(file.dueDate)
  return {
    ...file,
    cycles,
    status,
    dossier,
    progress,
    anomalies: status === "depose" ? 0 : counts.anomalie,
    warnings: status === "depose" ? 0 : counts.attention,
    pending,
    openPending: pending.filter((p) => p.status !== "resolu").length,
    daysLeft,
    late: status !== "depose" && daysLeft < 0,
  }
}

function useStoreSlice(): StoreSlice {
  const controls = useDemoStore((s) => s.controls)
  const reviews = useDemoStore((s) => s.reviews)
  const cycleComments = useDemoStore((s) => s.cycleComments)
  const statusOverrides = useDemoStore((s) => s.statusOverrides)
  const pendingAdded = useDemoStore((s) => s.pendingAdded)
  const pendingStatus = useDemoStore((s) => s.pendingStatus)
  const dossierEdits = useDemoStore((s) => s.dossierEdits)
  return useMemo(
    () => ({ controls, reviews, cycleComments, statusOverrides, pendingAdded, pendingStatus, dossierEdits }),
    [controls, reviews, cycleComments, statusOverrides, pendingAdded, pendingStatus, dossierEdits],
  )
}

export function useAnnualFiles(): AnnualFileView[] {
  const slice = useStoreSlice()
  return useMemo(() => ANNUAL_FILES.map((f) => buildView(f, slice)), [slice])
}

export function useAnnualFile(id: string): AnnualFileView | undefined {
  const slice = useStoreSlice()
  return useMemo(() => {
    const f = getAnnualFile(id)
    return f ? buildView(f, slice) : undefined
  }, [id, slice])
}
