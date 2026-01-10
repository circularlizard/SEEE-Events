"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNavigationMenu } from "./use-navigation";

export function MobileNavigation() {
  const {
    visibleSections,
    activeHref,
    showSectionContext,
    showSectionDropdown,
    currentSection,
    sectionLabel,
    handleSectionChange,
    availableSections,
    changeSectionHref,
    canChangeSection,
  } = useNavigationMenu();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  const closeAndNavigate = () => setOpen(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex w-72 max-w-full flex-col bg-background text-foreground border-r border-border shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Navigation</p>
                {showSectionContext && (
                  <p className="text-sm font-semibold text-foreground">{sectionLabel}</p>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            {showSectionContext && (
              <div className="px-4 py-3 border-b space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Section</p>
                {showSectionDropdown && currentSection ? (
                  <Select value={currentSection.sectionId} onValueChange={handleSectionChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section.sectionId} value={section.sectionId}>
                          {section.sectionName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground truncate">{sectionLabel}</div>
                )}
                {canChangeSection && (
                  <Link href={changeSectionHref} onClick={closeAndNavigate}>
                    <Button type="button" variant="outline" size="sm" className="w-full">
                      Change section
                    </Button>
                  </Link>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {visibleSections.map((section, idx) => (
                <div key={section.title ?? idx} className="space-y-2">
                  {section.title && (
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{section.title}</p>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeAndNavigate}
                        className={cn(
                          "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          activeHref === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
