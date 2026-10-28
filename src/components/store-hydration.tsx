"use client"

import { useEffect } from "react"

import { useDemoStore } from "@/lib/store"

/** Recharge la mémoire de la démo (navigateur) une fois la page affichée. */
export function StoreHydration() {
  useEffect(() => {
    void useDemoStore.persist.rehydrate()
  }, [])
  return null
}
