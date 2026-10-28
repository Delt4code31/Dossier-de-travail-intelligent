"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { usePathname, useRouter } from "next/navigation"
import { useMemo } from "react"
import { Building, ChevronDown, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { DOSSIERS } from "@/lib/data"
import { useDemoStore } from "@/lib/store"

interface DossierItem {
  value: string
  label: string
  siren: string
  city: string
}

const ITEMS: DossierItem[] = [...DOSSIERS]
  .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  .map((d) => ({ value: d.id, label: d.name, siren: d.siren, city: d.address.city }))

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/** Dossier affiché dans l'URL courante (ex. /analyse/kaleido-software/controles) */
function dossierFromUrl(pathname: string) {
  const m = pathname.match(/^\/(?:production\/dossiers-annuels|production\/parametrage|analyse)\/([^/]+)/)
  return m?.[1] ?? null
}

/** Où aller quand on choisit une société, selon la page où l'on se trouve. */
function targetFor(pathname: string, id: string) {
  if (pathname.startsWith("/analyse")) {
    const tab = pathname.split("/")[3]
    return `/analyse/${id}${tab ? `/${tab}` : ""}`
  }
  if (pathname.startsWith("/production/parametrage")) return `/production/parametrage/${id}`
  if (pathname.startsWith("/documents")) return `/documents?d=${id}`
  if (pathname.startsWith("/ged")) return `/ged?d=${id}`
  const m = pathname.match(/^\/production\/dossiers-annuels\/[^/]+(\/[^/]+)?/)
  return `/production/dossiers-annuels/${id}${m?.[1] ?? ""}`
}

/** Sélecteur de société, comme dans l'en-tête de Fiscalis. */
export function CompanySwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const activeId = useDemoStore((s) => s.activeDossierId)
  const setActive = useDemoStore((s) => s.setActiveDossier)

  // Comme Fiscalis : la société affichée est celle de la page ; ailleurs, « Choisir une société… »
  // (sur la GED et les documents, la page indique elle-même le dossier consulté)
  const currentId =
    dossierFromUrl(pathname) ?? (pathname.startsWith("/ged") || pathname.startsWith("/documents") ? activeId : null)
  const current = useMemo(() => ITEMS.find((i) => i.value === currentId) ?? null, [currentId])

  return (
    <Combobox
      items={ITEMS}
      value={current}
      onValueChange={(item: DossierItem | null) => {
        if (!item) return
        setActive(item.value)
        router.push(targetFor(pathname, item.value))
      }}
      itemToStringLabel={(item: DossierItem) => item.label}
      isItemEqualToValue={(a: DossierItem, b: DossierItem) => a.value === b.value}
      filter={(item: DossierItem, query: string) =>
        normalize(item.label).includes(normalize(query)) || item.siren.includes(query.replace(/\s/g, ""))
      }
    >
      <ComboboxPrimitive.Trigger
        render={
          <Button
            variant="outline"
            className="h-8 w-full justify-between gap-2 px-2.5 font-normal sm:w-96"
            aria-label="Choisir une société"
          />
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Building className="text-muted-foreground" />
          {current ? (
            <>
              <span className="truncate">{current.label}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{current.siren}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">Choisir une société…</span>
          )}
        </span>
        <ChevronDown className="text-muted-foreground" />
      </ComboboxPrimitive.Trigger>
      <ComboboxContent align="end" className="w-(--anchor-width) min-w-80">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <ComboboxPrimitive.Input render={<InputGroupInput placeholder="Rechercher (nom, SIREN)…" />} />
        </InputGroup>
        <ComboboxEmpty>Aucune société trouvée</ComboboxEmpty>
        <ComboboxList>
          {(item: DossierItem) => (
            <ComboboxItem key={item.value} value={item}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono">{item.siren}</span> · {item.city}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
