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
import { useMembers, useMembersLoadingState, useMembersProgress } from '@/store/use-store'
import type { NormalizedMember } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type SortField = 'name' | 'age' | 'dob' | 'patrol' | 'status'
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
  if (state === 'complete') return null
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" aria-hidden />
        Error
      </span>
    )
  }
  
  const labels: Record<string, string> = {
    pending: 'Pending',
    summary: 'Loading...',
    individual: 'Loading details...',
    customData: 'Loading contacts...',
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      {labels[state] || 'Loading...'}
    </span>
  )
}

/**
 * Mobile card view for a single member
 */
function MemberCard({ member, onClick }: { member: NormalizedMember; onClick?: () => void }) {
  const age = calculateAge(member.dateOfBirth)
  
  return (
    <div 
      className="bg-card border rounded-lg p-4 space-y-3"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">
            {member.lastName}, {member.firstName}
          </h3>
          <p className="text-sm text-muted-foreground">{member.patrolName}</p>
        </div>
        <MemberLoadingState state={member.loadingState} />
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="space-y-1">
          <p>
            <span className="text-muted-foreground">Age:</span>{' '}
            {age !== null ? `${age} years` : '—'}
          </p>
          <p>
            <span className="text-muted-foreground">DOB:</span>{' '}
            {formatDob(member.dateOfBirth)}
          </p>
        </div>
        <MemberStatusIcons member={member} />
      </div>
    </div>
  )
}

/**
 * Progress bar for member hydration
 */
function HydrationProgress() {
  const loadingState = useMembersLoadingState()
  const progress = useMembersProgress()
  
  if (loadingState === 'idle' || loadingState === 'complete') return null
  
  const percentage = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0
  
  const phaseLabels: Record<string, string> = {
    'loading-summary': 'Loading member list...',
    'loading-individual': 'Loading member details...',
    'loading-custom': 'Loading contact information...',
    'error': 'Error loading members',
  }
  
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {phaseLabels[loadingState] || 'Loading...'}
        </span>
        <span className="font-medium">
          {progress.completed} / {progress.total}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

/**
 * Main members table/list component
 */
export function MembersClient() {
  const members = useMembers()
  const loadingState = useMembersLoadingState()
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
  
  // Empty state
  if (members.length === 0 && loadingState === 'idle') {
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
  if (members.length === 0 && loadingState !== 'idle') {
    return (
      <div className="space-y-4">
        <HydrationProgress />
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" aria-hidden />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Progress bar during hydration */}
      <HydrationProgress />
      
      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{members.length} members</span>
        {loadingState === 'complete' && (
          <button 
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => {
              // TODO: Implement refresh functionality
              console.log('Refresh members')
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
        )}
      </div>
      
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2">
                <SortableHeader 
                  label="Name" 
                  field="name" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                />
              </th>
              <th className="text-left py-3 px-2">
                <SortableHeader 
                  label="Age" 
                  field="age" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                />
              </th>
              <th className="text-left py-3 px-2">
                <SortableHeader 
                  label="DOB" 
                  field="dob" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                />
              </th>
              <th className="text-left py-3 px-2">
                <SortableHeader 
                  label="Patrol" 
                  field="patrol" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                />
              </th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">
                <SortableHeader 
                  label="Loading" 
                  field="status" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => {
              const age = calculateAge(member.dateOfBirth)
              return (
                <tr 
                  key={member.id} 
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-2 font-medium">
                    {member.lastName}, {member.firstName}
                  </td>
                  <td className="py-3 px-2">
                    {age !== null ? `${age}` : '—'}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">
                    {formatDob(member.dateOfBirth)}
                  </td>
                  <td className="py-3 px-2">
                    {member.patrolName}
                  </td>
                  <td className="py-3 px-2">
                    <MemberStatusIcons member={member} />
                  </td>
                  <td className="py-3 px-2">
                    <MemberLoadingState state={member.loadingState} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
