'use client'

import { useState, useMemo } from 'react'
import { 
  Camera, 
  Stethoscope, 
  AlertTriangle, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useMembers } from '@/hooks/useMembers'
import type { NormalizedMember } from '@/lib/schemas'
import { cn } from '@/lib/utils'

/**
 * Format other sections for display (excludes the primary patrol)
 */
function formatSections(otherSections: string[]): string {
  return otherSections.filter(Boolean).join(', ');
}

type SortField = 'name' | 'age' | 'dob' | 'patrol' | 'sections' | 'status'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

/**
 * Calculate age in years from DOB string (YYYY-MM-DD format)
 */
function calculateAge(dob: string | null): number | null {
  if (!dob) return null
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return null
  
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Format DOB for display (DD/MM/YYYY)
 */
function formatDob(dob: string | null): string {
  if (!dob) return '—'
  const date = new Date(dob)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Sort members by the specified field and direction
 */
function sortMembers(members: NormalizedMember[], config: SortConfig): NormalizedMember[] {
  return [...members].sort((a, b) => {
    let comparison = 0
    
    switch (config.field) {
      case 'name':
        comparison = `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
        break
      case 'age': {
        const ageA = calculateAge(a.dateOfBirth)
        const ageB = calculateAge(b.dateOfBirth)
        if (ageA === null && ageB === null) comparison = 0
        else if (ageA === null) comparison = 1
        else if (ageB === null) comparison = -1
        else comparison = ageA - ageB
        break
      }
      case 'dob': {
        const dobA = a.dateOfBirth || ''
        const dobB = b.dateOfBirth || ''
        comparison = dobA.localeCompare(dobB)
        break
      }
      case 'patrol':
        comparison = a.patrolName.localeCompare(b.patrolName)
        break
      case 'status':
        // Sort by loading state: complete first, then in-progress, then error
        const stateOrder = { complete: 0, customData: 1, individual: 2, summary: 3, pending: 4, error: 5 }
        comparison = stateOrder[a.loadingState] - stateOrder[b.loadingState]
        break
    }
    
    return config.direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Column header with sort indicator
 */
function SortableHeader({ 
  label, 
  field, 
  currentSort, 
  onSort,
  className
}: { 
  label: string
  field: SortField
  currentSort: SortConfig
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = currentSort.field === field
  
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 font-semibold hover:text-primary transition-colors",
        isActive && "text-primary",
        className
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {isActive ? (
        currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" aria-hidden />
        ) : (
          <ArrowDown className="h-4 w-4" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" aria-hidden />
      )}
    </button>
  )
}

/**
 * Status icons for member data quality
 */
function MemberStatusIcons({ member }: { member: NormalizedMember }) {
  const hasPhotoConsent = member.consents?.photoConsent ?? false
  const hasMedicalInfo = !!member.medicalNotes
  const hasAllergies = !!member.allergyNotes
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          hasPhotoConsent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
        )}
        title={hasPhotoConsent ? "Photo consent given" : "No photo consent"}
        aria-label={hasPhotoConsent ? "Photo consent given" : "No photo consent"}
      >
        <Camera className="h-3.5 w-3.5" aria-hidden />
      </span>
      
      <span 
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          hasMedicalInfo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
        )}
        title={hasMedicalInfo ? "Has medical notes" : "No medical notes"}
        aria-label={hasMedicalInfo ? "Has medical notes" : "No medical notes"}
      >
        <Stethoscope className="h-3.5 w-3.5" aria-hidden />
      </span>
      
      <span 
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          hasAllergies ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
        )}
        title={hasAllergies ? "Has allergy information" : "No allergies recorded"}
        aria-label={hasAllergies ? "Has allergy information" : "No allergies recorded"}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      </span>
    </div>
  )
}

/**
 * Loading state indicator for individual member
 */
function MemberLoadingState({ state }: { state: NormalizedMember['loadingState'] }) {
  if (state === 'complete') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700" 
            title="Data fully loaded"
            aria-label="Data fully loaded">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
    )
  }
  
  if (state === 'error') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700"
            title="Error loading data"
            aria-label="Error loading data">
        <AlertTriangle className="h-4 w-4" aria-hidden />
      </span>
    )
  }
  
  const loadingLabels: Record<string, string> = {
    pending: 'Pending',
    summary: 'Loading member',
    individual: 'Loading details',
    customData: 'Loading contacts',
  }
  
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700"
          title={loadingLabels[state] || 'Loading...'}
          aria-label={loadingLabels[state] || 'Loading...'}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
    </span>
  )
}

/**
 * Mobile card view for a single member
 */
function MemberCard({ member, onClick }: { member: NormalizedMember; onClick?: () => void }) {
  const age = calculateAge(member.dateOfBirth)
  const sections = member.otherSections.length > 0 
    ? `Also in: ${formatSections(member.otherSections)}`
    : '';
  
  return (
    <div 
      className="bg-card border rounded-lg p-4 space-y-3"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <MemberLoadingState state={member.loadingState} />
          </div>
          <div>
            <h3 className="font-semibold text-base">
              {member.lastName}, {member.firstName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {member.patrolName} • {age !== null ? `${age} years` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MemberStatusIcons member={member} />
        </div>
      </div>
      
      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">DOB:</span>{' '}
          {formatDob(member.dateOfBirth)}
        </p>
        {sections && (
          <p className="text-sm text-muted-foreground">{sections}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Main members table/list component
 */
export function MembersClient() {
  const { members, isLoading, isFetched, refresh } = useMembers()
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' })
  
  const sortedMembers = useMemo(
    () => sortMembers(members, sortConfig),
    [members, sortConfig]
  )
  
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }
  
  // Empty state (not loading and no members)
  if (members.length === 0 && !isLoading && !isFetched) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden />
        <h2 className="text-lg font-semibold mb-2">No members loaded</h2>
        <p className="text-muted-foreground mb-4">
          Select a section to load member data.
        </p>
      </div>
    )
  }
  
  // Loading state (no members yet)
  if (members.length === 0 && isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" aria-hidden />
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{members.length} members</span>
        {isFetched && (
          <button 
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
        )}
      </div>

      {/* Icon legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
        <span className="font-medium">Key:</span>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Status icons */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span>Loaded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700">
              <Loader2 className="h-3 w-3" aria-hidden />
            </span>
            <span>Loading</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-3 w-3" aria-hidden />
            </span>
            <span>Error</span>
          </div>
          
          {/* Divider */}
          <span className="text-muted-foreground/30">|</span>
          
          {/* Detail icons */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700">
              <Camera className="h-3 w-3" aria-hidden />
            </span>
            <span>Photo consent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700">
              <Stethoscope className="h-3 w-3" aria-hidden />
            </span>
            <span>Medical notes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-3 w-3" aria-hidden />
            </span>
            <span>Allergies</span>
          </div>
        </div>
      </div>
      
      {/* Desktop table view */}
      <div className="hidden md:block">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="border-b">
                <th className="text-center p-4 font-semibold w-16">
                  <SortableHeader 
                    label="Status" 
                    field="status" 
                    currentSort={sortConfig} 
                    onSort={handleSort}
                    className="justify-center"
                  />
                </th>
                <th className="text-left p-4 font-semibold">
                  <SortableHeader 
                    label="Name" 
                    field="name" 
                    currentSort={sortConfig} 
                    onSort={handleSort} 
                  />
                </th>
                <th className="text-left p-4 font-semibold">
                  <SortableHeader 
                    label="Age" 
                    field="age" 
                    currentSort={sortConfig} 
                    onSort={handleSort} 
                  />
                </th>
                <th className="text-left p-4 font-semibold">
                  <SortableHeader 
                    label="DOB" 
                    field="dob" 
                    currentSort={sortConfig} 
                    onSort={handleSort} 
                  />
                </th>
                <th className="text-center p-4 font-semibold">
                  Details
                </th>
                <th className="text-left p-4 font-semibold">
                  <SortableHeader 
                    label="Patrol" 
                    field="patrol" 
                    currentSort={sortConfig} 
                    onSort={handleSort} 
                  />
                </th>
                <th className="text-left p-4 font-semibold">Sections</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => {
                const age = calculateAge(member.dateOfBirth)
                return (
                  <tr 
                    key={member.id} 
                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <MemberLoadingState state={member.loadingState} />
                    </td>
                    <td className="p-4 font-medium">
                      {member.lastName}, {member.firstName}
                    </td>
                    <td className="p-4">
                      {age !== null ? `${age}` : '—'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDob(member.dateOfBirth)}
                    </td>
                    <td className="p-4 text-center">
                      <MemberStatusIcons member={member} />
                    </td>
                    <td className="p-4">
                      {member.patrolName}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {member.otherSections.length > 0 ? (
                        member.otherSections.join(', ')
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {sortedMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
