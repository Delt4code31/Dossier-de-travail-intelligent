import {
  ChartLine,
  FileText,
  FolderKanban,
  FolderOpen,
  House,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * Arborescence de l'application (inspirée de la navigation Pennylane) :
 * une colonne de sections, et pour les sections qui en ont, un panneau de sous-pages.
 */

export interface NavLink {
  label: string
  href: string
}

export interface NavGroup {
  label: string
  items: NavLink[]
}

export interface NavSection {
  id: string
  label: string
  icon: LucideIcon
  href: string
  /** Préfixes d'URL qui rendent la section active */
  match: string[]
  position: "top" | "bottom"
  groups?: NavGroup[]
}

export const NAV: NavSection[] = [
  { id: "accueil", label: "Accueil", icon: House, href: "/", match: ["/"], position: "top" },
  {
    id: "production",
    label: "Production",
    icon: FolderKanban,
    href: "/production/dossiers-annuels",
    match: ["/production"],
    position: "top",
    groups: [
      {
        label: "Tableau de suivi",
        items: [
          { label: "Paramétrage", href: "/production/parametrage" },
          { label: "Dossiers annuels", href: "/production/dossiers-annuels" },
          { label: "Supervision", href: "/production/supervision" },
        ],
      },
    ],
  },
  { id: "analyse", label: "Analyse", icon: ChartLine, href: "/analyse", match: ["/analyse"], position: "top" },
  { id: "documents", label: "Documents", icon: FileText, href: "/documents", match: ["/documents"], position: "top" },
  { id: "ged", label: "GED", icon: FolderOpen, href: "/ged", match: ["/ged"], position: "top" },
  { id: "utilisateurs", label: "Utilisateurs", icon: Users, href: "/utilisateurs", match: ["/utilisateurs"], position: "bottom" },
  { id: "admin", label: "Admin", icon: ShieldCheck, href: "/admin", match: ["/admin"], position: "bottom" },
]

export function activeSection(pathname: string) {
  if (pathname === "/") return NAV[0]!
  return NAV.find((s) => s.id !== "accueil" && s.match.some((m) => pathname.startsWith(m)))
}

export function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
