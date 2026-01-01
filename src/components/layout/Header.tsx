"use client";

import { useStore } from "@/store/use-store";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, TentTree } from "lucide-react";
import { useLogout } from "@/components/QueryProvider";
import { APP_LABELS } from "@/types/app";
import { cn } from "@/lib/utils";

export default function Header() {
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const availableSections = useStore((s) => s.availableSections);
  const currentApp = useStore((s) => s.currentApp);
  const selectedSectionName = currentSection?.sectionName ?? null;
  const multiNames = selectedSections.length > 0 ? selectedSections.map((s) => s.sectionName) : [];
  const { data: session } = useSession();
  const pathname = usePathname();
  const logout = useLogout();

  const showChangeSectionButton = availableSections.length > 1;
  const changeSectionHref = `/dashboard/section-picker?redirect=${encodeURIComponent(pathname || "/dashboard")}`;
  const appLabel = currentApp ? APP_LABELS[currentApp] : APP_LABELS.expedition;
  const initials = (() => {
    const name = session?.user?.name || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "SU";
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    const value = (first + last).toUpperCase();
    return value || "SU";
  })();

  return (
    <header className="w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sticky top-0 z-40">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TentTree className="h-6 w-6 text-primary" aria-hidden />
          <span className="font-semibold tracking-tight text-lg">OSM Dashboard</span>
          <span
            className={cn(
              "hidden md:inline-flex text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border",
              "bg-muted text-muted-foreground"
            )}
          >
            {appLabel}
          </span>
          <div className="flex items-center gap-2 md:hidden">
            {multiNames.length > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                      • {multiNames.join(", ")}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{multiNames.join(", ")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              selectedSectionName && <span className="text-sm text-muted-foreground">• {selectedSectionName}</span>
            )}
            {showChangeSectionButton && (
              <Link href={changeSectionHref}>
                <Button variant="outline" size="sm" className="ml-1">
                  Change Section
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full focus:outline-none" aria-label="User menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
