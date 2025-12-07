"use client";
import { useStore } from "@/store/use-store";
import { useSession } from "next-auth/react";
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
import { signOut } from "next-auth/react";

export default function Header() {
  const currentSection = useStore((s) => s.currentSection);
  const setSectionPickerOpen = useStore((s) => s.setSectionPickerOpen);
  const selectedSections = useStore((s) => s.selectedSections);
  const selectedSectionName = currentSection?.sectionName ?? null;
  const multiNames = selectedSections.length > 0 ? selectedSections.map(s => s.sectionName) : [];
  const { data: session } = useSession();
  const initials = (() => {
    const name = session?.user?.name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'SU';
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    const value = (first + last).toUpperCase();
    return value || 'SU';
  })();
  return (
    <header className="w-full border-b bg-background">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TentTree className="h-6 w-6 text-primary" aria-hidden />
          <span className="font-semibold tracking-tight text-lg">SEEE Expedition Dashboard</span>
          {(multiNames.length > 0) ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-muted-foreground truncate max-w-[240px]">• {multiNames.join(', ')}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {multiNames.join(', ')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : selectedSectionName && (
            <span className="text-sm text-muted-foreground">• {selectedSectionName}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => setSectionPickerOpen(true)}
          >
            Change Section
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full focus:outline-none" aria-label="User menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
