'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SectionSelector } from '@/components/SectionSelector'
import type { AppKey } from '@/types/app'

export const requiredApp: AppKey = 'multi'

/**
 * Section Picker Page Content
 * 
 * This route is kept for backward compatibility (e.g., existing links).
 * The actual section selection logic is now handled by:
 * - /dashboard page when no section is selected (shows full-screen selector)
 * - Sidebar dropdown when a section is already selected (inline switcher)
 */
function SectionPickerContent() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  
  return <SectionSelector redirectTo={redirect} allowSkip={true} />
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
