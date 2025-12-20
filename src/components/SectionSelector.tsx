'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/use-store'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle } from 'lucide-react'

const REMEMBER_KEY = 'seee.sectionSelection.v1'

interface RememberedSelection {
  userId: string
  selectedSectionId: string
  timestamp: string
}

interface SectionSelectorProps {
  /** Redirect path after selection (default: /dashboard) */
  redirectTo?: string
  /** Show "Skip for now" button if there's a valid existing selection */
  allowSkip?: boolean
}

/**
 * Section Selector Component
 * 
 * Full-screen section picker UI that allows selecting a single section.
 * Used when no section is currently selected (e.g., first login, or after clearing selection).
 */
export function SectionSelector({ redirectTo = '/dashboard', allowSkip = false }: SectionSelectorProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
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
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
      router.replace(redirectTo)
    }
  }, [availableSections, setCurrentSection, router, redirectTo])

  // Initialize picker selection from existing store selection
  useEffect(() => {
    if (selectedId) return

    if (currentSection?.sectionId) {
      setSelectedId(currentSection.sectionId)
    } else if (selectedSections.length > 0) {
      setSelectedId(selectedSections[0].sectionId)
    }
  }, [selectedSections, currentSection, selectedId])
  
  const selectSection = (sectionId: string) => {
    setSelectedId(sectionId)
  }
  
  const handleContinue = () => {
    if (!selectedId) return
    
    setIsSubmitting(true)
    
    const selected = availableSections.find(s => s.sectionId === selectedId)
    if (!selected) return
    
    setCurrentSection({
      sectionId: selected.sectionId,
      sectionName: selected.sectionName,
      sectionType: selected.sectionType,
      termId: selected.termId,
    })
    setSelectedSections([])
    
    if (rememberSelection && userId) {
      const payload: RememberedSelection = {
        userId,
        selectedSectionId: selectedId,
        timestamp: new Date().toISOString(),
      }
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload))
      } catch {
        // localStorage might be unavailable
      }
    } else {
      try {
        localStorage.removeItem(REMEMBER_KEY)
      } catch {
        // ignore
      }
    }
    
    clearQueue()
    
    queryClient.removeQueries({ queryKey: ['events'] })
    queryClient.removeQueries({ queryKey: ['event-summary'] })
    queryClient.removeQueries({ queryKey: ['attendance'] })
    queryClient.removeQueries({ queryKey: ['per-person-attendance'] })
    queryClient.removeQueries({ queryKey: ['members'] })
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[SectionSelector] Removed cached queries and cleared event queue after section change')
    }
    
    router.replace(redirectTo)
  }
  
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
          <h1 className="text-3xl font-bold mb-2">Select Your Section</h1>
          <p className="text-muted-foreground">
            You have access to multiple sections. Choose which one you want to work with.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Available Sections</CardTitle>
            <CardDescription>
              Select the section you want to work with
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableSections.map((section) => {
              const isSelected = selectedId === section.sectionId
              return (
                <button
                  key={section.sectionId}
                  onClick={() => selectSection(section.sectionId)}
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
                      <Circle className="h-5 w-5" />
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
              disabled={!selectedId || isSubmitting}
              className="w-full mt-4"
              size="lg"
            >
              {isSubmitting ? 'Loading...' : 'Continue'}
            </Button>
            
            {allowSkip && hasValidExistingSelection && (
              <button
                onClick={() => router.replace(redirectTo)}
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
