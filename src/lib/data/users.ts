import type { RoleId, TeamId, User } from "./types"

/** Utilisateur connecté dans la démo */
export const CURRENT_USER_ID = "yann"

export const TEAMS: Record<TeamId, string> = {
  pme: "Pôle PME",
  tpe: "Pôle TPE & Indépendants",
}

export const ROLES: Record<RoleId, { label: string; description: string }> = {
  admin: {
    label: "Administrateur",
    description: "Gère les utilisateurs, les connexions et tous les dossiers.",
  },
  expert_comptable: {
    label: "Expert-comptable",
    description: "Supervise un portefeuille, valide et signe les dossiers annuels.",
  },
  chef_mission: {
    label: "Chef de mission",
    description: "Organise la production et révise les cycles des collaborateurs.",
  },
  collaborateur: {
    label: "Collaborateur",
    description: "Prépare les dossiers annuels de son portefeuille.",
  },
}

export type Permission =
  | "consulter"
  | "preparer"
  | "reviser"
  | "valider"
  | "parametrer"
  | "analyser"
  | "utilisateurs"
  | "connexions"

export const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: "consulter", label: "Consulter les dossiers de son portefeuille" },
  { id: "preparer", label: "Préparer les cycles et cocher les contrôles" },
  { id: "analyser", label: "Lancer les analyses et l'assistant IA" },
  { id: "reviser", label: "Réviser les cycles (visa de revue)" },
  { id: "valider", label: "Valider le dossier annuel" },
  { id: "parametrer", label: "Paramétrer un dossier (équipe, seuils, liaisons)" },
  { id: "utilisateurs", label: "Inviter et gérer les utilisateurs" },
  { id: "connexions", label: "Gérer les connexions Pennylane et SharePoint" },
]

export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  admin: [
    "consulter",
    "preparer",
    "analyser",
    "reviser",
    "valider",
    "parametrer",
    "utilisateurs",
    "connexions",
  ],
  expert_comptable: ["consulter", "preparer", "analyser", "reviser", "valider", "parametrer"],
  chef_mission: ["consulter", "preparer", "analyser", "reviser", "parametrer"],
  collaborateur: ["consulter", "preparer", "analyser"],
}

export const USERS: User[] = [
  {
    id: "yann",
    firstName: "Yann",
    lastName: "Jammes",
    email: "yann.jammes@audit-cpa.com",
    role: "admin",
    title: "Expert-comptable associé",
    team: "tpe",
    status: "actif",
    lastLoginAt: "2026-10-05T08:52:00+02:00",
  },
  {
    id: "sophie",
    firstName: "Sophie",
    lastName: "Lambert",
    email: "sophie.lambert@exemple.fr",
    role: "expert_comptable",
    title: "Expert-comptable associée",
    team: "pme",
    status: "actif",
    lastLoginAt: "2026-10-05T08:31:00+02:00",
  },
  {
    id: "thomas",
    firstName: "Thomas",
    lastName: "Girard",
    email: "thomas.girard@exemple.fr",
    role: "chef_mission",
    title: "Chef de mission",
    team: "pme",
    status: "actif",
    lastLoginAt: "2026-10-05T09:12:00+02:00",
  },
  {
    id: "manon",
    firstName: "Manon",
    lastName: "Chevalier",
    email: "manon.chevalier@exemple.fr",
    role: "chef_mission",
    title: "Cheffe de mission",
    team: "pme",
    status: "actif",
    lastLoginAt: "2026-10-04T17:46:00+02:00",
  },
  {
    id: "camille",
    firstName: "Camille",
    lastName: "Roux",
    email: "camille.roux@exemple.fr",
    role: "chef_mission",
    title: "Cheffe de mission",
    team: "tpe",
    status: "actif",
    lastLoginAt: "2026-10-05T09:05:00+02:00",
  },
  {
    id: "lucas",
    firstName: "Lucas",
    lastName: "Bernard",
    email: "lucas.bernard@exemple.fr",
    role: "collaborateur",
    title: "Collaborateur comptable",
    team: "pme",
    status: "actif",
    lastLoginAt: "2026-10-05T08:58:00+02:00",
  },
  {
    id: "lea",
    firstName: "Léa",
    lastName: "Fournier",
    email: "lea.fournier@exemple.fr",
    role: "collaborateur",
    title: "Collaboratrice comptable",
    team: "pme",
    status: "actif",
    lastLoginAt: "2026-10-05T09:20:00+02:00",
  },
  {
    id: "ines",
    firstName: "Inès",
    lastName: "Moreau",
    email: "ines.moreau@exemple.fr",
    role: "collaborateur",
    title: "Collaboratrice comptable",
    team: "tpe",
    status: "actif",
    lastLoginAt: "2026-10-05T08:47:00+02:00",
  },
  {
    id: "hugo",
    firstName: "Hugo",
    lastName: "Petit",
    email: "hugo.petit@exemple.fr",
    role: "collaborateur",
    title: "Collaborateur comptable",
    team: "tpe",
    status: "actif",
    lastLoginAt: "2026-10-02T18:03:00+02:00",
  },
  {
    id: "nathan",
    firstName: "Nathan",
    lastName: "Mercier",
    email: "nathan.mercier@exemple.fr",
    role: "collaborateur",
    title: "Collaborateur comptable (alternance)",
    team: "tpe",
    status: "invite",
    lastLoginAt: null,
  },
]

const byId = new Map(USERS.map((u) => [u.id, u]))

export function getUser(id: string) {
  return byId.get(id)
}

export function userName(id: string | null | undefined) {
  if (!id) return "—"
  if (id === "client") return "Client"
  const u = byId.get(id)
  return u ? `${u.firstName} ${u.lastName}` : id
}

export function userShortName(id: string | null | undefined) {
  if (!id) return "—"
  if (id === "client") return "Client"
  const u = byId.get(id)
  return u ? `${u.firstName} ${u.lastName[0]}.` : id
}
