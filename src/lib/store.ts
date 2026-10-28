"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type {
  AnnualStatus,
  ControlState,
  Dossier,
  PendingItem,
  PendingStatus,
} from "@/lib/data/types"

/**
 * Mémoire de la démo (enregistrée dans le navigateur) : contrôles cochés, revues,
 * commentaires, points en suspens ajoutés, paramétrages modifiés…
 * En production, ces informations seront enregistrées dans une base de données.
 */

export interface CycleReview {
  by: string
  at: string
}

interface DemoState {
  navPinned: boolean
  activeDossierId: string | null
  /** clé : `${dossierAnnuel}:${contrôle}` */
  controls: Record<string, ControlState>
  /** clé : `${dossierAnnuel}:${cycle}` — null = revue retirée */
  reviews: Record<string, CycleReview | null>
  cycleComments: Record<string, string>
  pendingAdded: PendingItem[]
  pendingStatus: Record<string, PendingStatus>
  /** clé : `${dossier}:${regroupement}` */
  analyticComments: Record<string, string>
  dossierEdits: Record<string, Partial<Dossier>>
  statusOverrides: Record<string, AnnualStatus>
  readNotifications: string[]
  doneTasks: string[]
  /** Horodatage des synchronisations lancées à la main (clé libre) */
  syncs: Record<string, string>

  setNavPinned: (pinned: boolean) => void
  setActiveDossier: (id: string | null) => void
  setControl: (fileId: string, controlId: string, state: ControlState) => void
  setReview: (fileId: string, cycle: string, review: CycleReview | null) => void
  setCycleComment: (fileId: string, cycle: string, comment: string) => void
  addPending: (item: PendingItem) => void
  setPendingStatus: (id: string, status: PendingStatus) => void
  setAnalyticComment: (dossierId: string, groupId: string, comment: string) => void
  editDossier: (id: string, patch: Partial<Dossier>) => void
  setStatus: (fileId: string, status: AnnualStatus) => void
  markNotificationsRead: (ids: string[]) => void
  toggleTask: (id: string) => void
  recordSync: (key: string, at: string) => void
  reset: () => void
}

const initial = {
  navPinned: true,
  activeDossierId: null,
  controls: {},
  reviews: {},
  cycleComments: {},
  pendingAdded: [],
  pendingStatus: {},
  analyticComments: {},
  dossierEdits: {},
  statusOverrides: {},
  readNotifications: [],
  doneTasks: [],
  syncs: {},
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      ...initial,
      setNavPinned: (navPinned) => set({ navPinned }),
      setActiveDossier: (activeDossierId) => set({ activeDossierId }),
      setControl: (fileId, controlId, state) =>
        set((s) => ({ controls: { ...s.controls, [`${fileId}:${controlId}`]: state } })),
      setReview: (fileId, cycle, review) =>
        set((s) => ({ reviews: { ...s.reviews, [`${fileId}:${cycle}`]: review } })),
      setCycleComment: (fileId, cycle, comment) =>
        set((s) => ({ cycleComments: { ...s.cycleComments, [`${fileId}:${cycle}`]: comment } })),
      addPending: (item) => set((s) => ({ pendingAdded: [item, ...s.pendingAdded] })),
      setPendingStatus: (id, status) =>
        set((s) => ({ pendingStatus: { ...s.pendingStatus, [id]: status } })),
      setAnalyticComment: (dossierId, groupId, comment) =>
        set((s) => ({
          analyticComments: { ...s.analyticComments, [`${dossierId}:${groupId}`]: comment },
        })),
      editDossier: (id, patch) =>
        set((s) => ({
          dossierEdits: { ...s.dossierEdits, [id]: { ...s.dossierEdits[id], ...patch } },
        })),
      setStatus: (fileId, status) =>
        set((s) => ({ statusOverrides: { ...s.statusOverrides, [fileId]: status } })),
      markNotificationsRead: (ids) =>
        set((s) => ({ readNotifications: Array.from(new Set([...s.readNotifications, ...ids])) })),
      toggleTask: (id) =>
        set((s) => ({
          doneTasks: s.doneTasks.includes(id)
            ? s.doneTasks.filter((t) => t !== id)
            : [...s.doneTasks, id],
        })),
      recordSync: (key, at) => set((s) => ({ syncs: { ...s.syncs, [key]: at } })),
      reset: () => set({ ...initial }),
    }),
    {
      name: "dossier-de-travail-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Le dossier « actif » (sélecteur de l'en-tête) n'est gardé que le temps de la visite
      partialize: (state) => Object.fromEntries(Object.entries(state).filter(([key]) => key !== "activeDossierId")),
      // La lecture du navigateur est faite après l'affichage (voir StoreHydration)
      skipHydration: true,
    },
  ),
)
