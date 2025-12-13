'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useStore, type Section } from '@/store/use-store'
import { cn } from '@/lib/utils'
import { Users, CheckCircle2 } from 'lucide-react'

const REMEMBER_KEY = 'seee.sectionSelection.v1'

interface RememberedSelection {
  userId: string
  selectedSectionIds: string[]
  timestamp: string
}

/**
 * Section Picker Page Content
 * 
 * Displayed after login for multi-section users who don't have a valid remembered selection.
 * Allows selecting one or more sections, with an option to remember the selection.
 */
function SectionPickerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const userId = session?.user && 'id' in session.user ? (session.user as { id: string }).id : undefined
  
  const availableSections = useStore((s) => s.availableSections)
  const currentSection = useStore((s) => s.currentSection)
  const selectedSections = useStore((s) => s.selectedSections)
  const setCurrentSection = useStore((s) => s.setCurrentSection)
  const setSelectedSections = useStore((s) => s.setSelectedSections)
  const clearQueue = useStore((s) => s.clearQueue)
  
  // Check if there's a valid existing selection that allows "Skip for now"
  const sectionIds = new Set(availableSections.map(s => s.sectionId))
  const hasValidExistingSelection = 
    (currentSection && sectionIds.has(currentSection.sectionId)) ||
    (selectedSections.length > 0 && selectedSections.some(s => sectionIds.has(s.sectionId)))
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rememberSelection, setRememberSelection] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // If only one section available, auto-select and redirect
  useEffect(() => {
    if (availableSections.length === 1) {
      const section = availableSections[0]
      setCurrentSection({
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        sectionType: section.sectionType,
        termId: section.termId,
      })
      router.replace(redirect)
    }
  }, [availableSections, setCurrentSection, router, redirect])

  // Initialize picker selection from existing store selection so it reflects
  // the current / previously chosen sections when opened.
  useEffect(() => {
    if (selectedIds.size > 0) return

    if (selectedSections.length > 0) {
      setSelectedIds(new Set(selectedSections.map((s) => s.sectionId)))
    } else if (currentSection?.sectionId) {
      setSelectedIds(new Set([currentSection.sectionId]))
    }
  }, [selectedSections, currentSection, selectedIds.size])
  
  const toggleSection = (sectionId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }
  
  const selectAll = () => {
    setSelectedIds(new Set(availableSections.map(s => s.sectionId)))
  }
  
  const clearAll = () => {
    setSelectedIds(new Set())
  }
  
  const handleContinue = () => {
    if (selectedIds.size === 0) return
    
    setIsSubmitting(true)
    
    // Build selected sections array
    const selected: Section[] = availableSections
      .filter(s => selectedIds.has(s.sectionId))
      .map(s => ({
        sectionId: s.sectionId,
        sectionName: s.sectionName,
        sectionType: s.sectionType,
        termId: s.termId,
      }))
    
    // Update store
    if (selected.length === 1) {
      setCurrentSection(selected[0])
      setSelectedSections([])
    } else {
      setCurrentSection(null)
      setSelectedSections(selected)
    }
    
    // Remember selection if checkbox is ticked and we have a userId
    if (rememberSelection && userId) {
      const payload: RememberedSelection = {
        userId,
        selectedSectionIds: Array.from(selectedIds),
        timestamp: new Date().toISOString(),
      }
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload))
      } catch {
        // localStorage might be unavailable
      }
    } else {
      // Clear any existing remembered selection
      try {
        localStorage.removeItem(REMEMBER_KEY)
      } catch {
        // ignore
      }
    }
    
    // Clear the event summary fetch queue (old section's events)
    clearQueue()
    
    // Remove old cached data to prevent showing stale events/people from previous section
    // Then invalidate to trigger fresh fetches with new section parameters
    queryClient.removeQueries({ queryKey: ['events'] })
    queryClient.removeQueries({ queryKey: ['event-summary'] })
    queryClient.removeQueries({ queryKey: ['attendance'] })
    queryClient.removeQueries({ queryKey: ['per-person-attendance'] })
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[SectionPicker] Removed cached queries and cleared event queue after section change')
    }
    
    router.replace(redirect)
  }
  
  // Don't render if single section (will auto-redirect)
  if (availableSections.length <= 1) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Sections</h1>
          <p className="text-muted-foreground">
            You have access to multiple sections. Choose which ones you want to work with.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Sections</CardTitle>
                <CardDescription>
                  {selectedIds.size} of {availableSections.length} selected
                </CardDescription>
              </div>
              <div className="flex gap-2 text-sm">
                <button 
                  onClick={selectAll} 
                  className="text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button 
                  onClick={clearAll} 
                  className="text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableSections.map((section) => {
              const isSelected = selectedIds.has(section.sectionId)
              return (
                <button
                  key={section.sectionId}
                  onClick={() => toggleSection(section.sectionId)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left',
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{section.sectionName}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {section.sectionType}
                    </div>
                  </div>
                </button>
              )
            })}
            
            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberSelection}
                  onCheckedChange={(checked) => setRememberSelection(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Remember my selection on this device
                </Label>
              </div>
            </div>
            
            <Button 
              onClick={handleContinue}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="w-full mt-4"
              size="lg"
            >
              {isSubmitting ? 'Loading...' : 'Continue'}
            </Button>
            
            {hasValidExistingSelection && (
              <button
                onClick={() => router.replace(redirect)}
                className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now (keep current selection)
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Section Picker Page - wrapped in Suspense for useSearchParams
 */
export default function SectionPickerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <SectionPickerContent />
    </Suspense>
  )
}
