"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/store/use-store";

interface Section { sectionId: string; sectionName: string }

export default function SectionPickerModal() {
  const sections = useStore((s) => s.availableSections);
  const currentSection = useStore((s) => s.currentSection);
  const selectedSections = useStore((s) => s.selectedSections);
  const setSelectedSections = useStore((s) => s.setSelectedSections);
  const [open, setOpen] = useState(false);
  const forcedOpen = useStore((s) => s.sectionPickerOpen);
  const setSectionPickerOpen = useStore((s) => s.setSectionPickerOpen);

  useEffect(() => {
    const multiple = sections && sections.length > 1;
    const hasSingleSelection = !!currentSection;
    const hasMultiSelection = selectedSections && selectedSections.length > 0;
    setOpen((multiple && !(hasSingleSelection || hasMultiSelection)) || forcedOpen);
  }, [sections, currentSection, selectedSections, forcedOpen]);

  const [picked, setPicked] = useState<string[]>(selectedSections.map(s => s.sectionId));
  const handleSave = () => {
    const selected = sections.filter(s => picked.includes(s.sectionId)).map(s => ({...s, sectionType: '' }));
    setSelectedSections(selected);
    setOpen(false);
    setSectionPickerOpen(false);
  };

  if (!sections || sections.length <= 1) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => setSectionPickerOpen(o)}>
      <DialogContent aria-describedby="section-picker-description">
        <DialogHeader>
          <DialogTitle>Select a Section</DialogTitle>
        </DialogHeader>
        <p id="section-picker-description" className="text-sm text-[var(--muted-foreground)]">
          Choose one or more sections to view. You can change this later from the header.
        </p>
        <div className="grid grid-cols-1 gap-3 mt-3">
          {sections.map((s: Section) => (
            <label key={s.sectionId} className="flex items-center gap-3 p-2 border rounded-md cursor-pointer">
              <Checkbox
                checked={picked.includes(s.sectionId)}
                onCheckedChange={() => {
                  setPicked((prev) => prev.includes(s.sectionId) ? prev.filter(x => x !== s.sectionId) : [...prev, s.sectionId]);
                }}
              />
              <span>{s.sectionName}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPicked(sections.map(s => s.sectionId))}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPicked([])}
            >
              Clear
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSectionPickerOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={picked.length === 0}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
