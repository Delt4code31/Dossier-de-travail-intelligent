import Link from "next/link"
import { FlaskConical, LogOut, Settings } from "lucide-react"

import { AppLauncher } from "@/components/layout/app-launcher"
import { CompanySwitcher } from "@/components/layout/company-switcher"
import { CpaLogo } from "@/components/layout/logo"
import { MobileNav } from "@/components/layout/mobile-nav"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** En-tête repris de Fiscalis : logo, sélecteur de société, notifications, réglages, déconnexion. */
export function AppHeader() {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 sm:h-14 sm:flex-nowrap sm:gap-x-4 sm:px-6 sm:py-0">
      <MobileNav />
      <CpaLogo />
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge variant="outline" tabIndex={0} className="hidden h-6 gap-1.5 text-muted-foreground lg:inline-flex">
              <FlaskConical />
              Démo · données fictives
            </Badge>
          }
        />
        <TooltipContent className="max-w-64">
          Prototype : les sociétés, chiffres et documents sont inventés. Le branchement Pennylane et SharePoint est
          préparé dans le code.
        </TooltipContent>
      </Tooltip>
      <div className="order-last flex w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 sm:justify-end">
        <CompanySwitcher />
      </div>
      <div className="ml-auto flex items-center gap-1 sm:ml-0">
        <AppLauncher />
        <NotificationsMenu />
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Mon compte" nativeButton={false} render={<Link href="/parametres" />} />}>
            <Settings />
          </TooltipTrigger>
          <TooltipContent>Mon compte</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Se déconnecter" nativeButton={false} render={<Link href="/connexion" />} />}>
            <LogOut />
          </TooltipTrigger>
          <TooltipContent>Se déconnecter</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
