/**
 * Point d'entrée unique des données de l'application.
 *
 * Aujourd'hui : données fictives générées localement.
 * Demain : remplacer ces fonctions par des appels à src/lib/integrations/
 * (Pennylane, SharePoint) sans toucher aux écrans.
 */

export * from "./types"
export * from "./referentiel"
export { USERS, TEAMS, ROLES, PERMISSIONS, ROLE_PERMISSIONS, CURRENT_USER_ID, getUser, userName, userShortName } from "./users"
export { DOSSIERS, getDossier, setupGaps, dossierTeamIds } from "./dossiers"
export { lastClosedExercises, liasseDeadline, agDeadline, greffeDeadline } from "./exercises"
export { getFinancials, groupRows, computeIndicators, sumAccounts, GROUPS } from "./balance"
export type { GroupRow, Indicators, FinancialData, GroupDef } from "./balance"
export { getChecks, checkCounts } from "./checks"
export {
  ANNUAL_FILES,
  getAnnualFile,
  getPendingItems,
  fileProgress,
  cycleStatus,
  cycleCounts,
  cycleAmount,
} from "./annual-files"
export { getFiscalDocuments } from "./documents"
export { getGed, findNode, pathTo, flattenFiles } from "./ged"
export { getActivity, NOTIFICATIONS, getTasks, getTopAlerts } from "./activity"
