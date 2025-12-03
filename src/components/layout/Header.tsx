"use client";
import { useStore } from "@/store/use-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const selectedSectionName = currentSection?.sectionName ?? null;
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TentTree className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-semibold tracking-tight">SEEE Expedition Dashboard</span>
          {selectedSectionName && (
            <span className="text-sm text-muted-foreground">• {selectedSectionName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full focus:outline-none" aria-label="User menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback>SU</AvatarFallback>
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
