'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { useMembers } from '@/hooks/useMembers'
import { getMemberIssues, getMembersWithIssues, getIssueCounts } from '@/lib/member-issues'
import type { NormalizedMember } from '@/lib/schemas'

function SeverityBadge({ severity }: { severity: 'critical' | 'medium' | 'low' }) {
  const variants = {
    critical: 'bg-destructive text-destructive-foreground',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white',
  }

  const labels = {
    critical: 'Critical',
    medium: 'Medium',
    low: 'Low',
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${variants[severity]}`}>
      {labels[severity]}
    </span>
  )
}

type SortField = 'name' | 'patrol' | 'details'
type SortDirection = 'asc' | 'desc'

interface SortableTableProps {
  members: NormalizedMember[]
  issueType: string
}

function SortableTable({ members, issueType }: SortableTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const membersWithIssue = useMemo(
    () =>
      members.filter((member) => {
        const issues = getMemberIssues(member)
        return issues.some((i) => i.type === issueType)
      }),
    [members, issueType]
  )

  const sortedMembers = useMemo(() => {
    return [...membersWithIssue].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      if (sortField === 'patrol') {
        return a.patrolName.localeCompare(b.patrolName) * direction
      }
      if (sortField === 'details') {
        const aIssue = getMemberIssues(a).find((i) => i.type === issueType)
        const bIssue = getMemberIssues(b).find((i) => i.type === issueType)
        return (aIssue?.description || '').localeCompare(bIssue?.description || '') * direction
      }
      return `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`) * direction
    })
  }, [membersWithIssue, sortField, sortDirection, issueType])

  const handleSort = (field: SortField) => {
    setSortField((prev) => (prev === field ? prev : field))
    setSortDirection((prev) => (field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'))
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    )
  }

  if (sortedMembers.length === 0) return null

  const detailHref = (id: string) => `/dashboard/planning/members/${encodeURIComponent(id)}?from=issues`

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium">
              <button onClick={() => handleSort('name')} className="flex items-center hover:text-foreground transition-colors">
                Name
                <SortIcon field="name" />
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              <button onClick={() => handleSort('patrol')} className="flex items-center hover:text-foreground transition-colors">
                Patrol
                <SortIcon field="patrol" />
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              <button onClick={() => handleSort('details')} className="flex items-center hover:text-foreground transition-colors">
                Issue Details
                <SortIcon field="details" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((member) => {
            const issue = getMemberIssues(member).find((i) => i.type === issueType)
            let issueDetails = issue?.description || ''
            if (issue?.missingFields?.length) {
              issueDetails += ` (Missing: ${issue.missingFields.join(', ')})`
            }
            if (issue?.duplicateContact) {
              issueDetails += ` (Same as ${issue.duplicateContact})`
            }

            return (
              <tr key={member.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 text-sm">
                  <Link href={detailHref(member.id)} className="font-medium text-primary hover:underline">
                    {member.lastName}, {member.firstName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{member.patrolName}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{issueDetails}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function MemberIssuesClient() {
  const { members, loadMissingMemberCustomData, isAdmin } = useMembers()
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 })

  const pendingMembers = useMemo(
    () => members.filter((member) => member.loadingState !== 'complete' && member.loadingState !== 'error'),
    [members]
  )

  const { counts, membersWithIssues } = useMemo(() => {
    const counts = getIssueCounts(members)
    const membersWithIssues = getMembersWithIssues(members)
    return { counts, membersWithIssues }
  }, [members])

  const handleLoadAll = async () => {
    if (!isAdmin || pendingMembers.length === 0) return

    setBulkStatus('loading')
    setBulkError(null)
    setBulkProgress({ total: pendingMembers.length, completed: 0 })

    try {
      await loadMissingMemberCustomData({
        onProgress: (progress) => setBulkProgress(progress),
      })
      setBulkStatus('success')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setBulkStatus('idle')
        return
      }
      setBulkStatus('error')
      setBulkError(error instanceof Error ? error.message : 'Failed to load custom data.')
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No members loaded. Please select a section to view member data issues.
        </p>
      </div>
    )
  }

  if (membersWithIssues.all.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
          <Info className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Issues Found</h2>
        <p className="text-muted-foreground">
          All {members.length} members have complete data. Great work!
        </p>
      </div>
    )
  }

  const issueDefinitions = [
    {
      id: 'no-contact-info',
      title: 'No Contact Information',
      description: 'Members with no contact details at all',
      count: counts.noContactInfo,
      severity: 'critical' as const,
      icon: AlertCircle,
      members: membersWithIssues.critical,
    },
    {
      id: 'no-email-or-phone',
      title: 'No Email or Phone',
      description: 'Members with no email address or phone number',
      count: counts.noEmailOrPhone,
      severity: 'critical' as const,
      icon: AlertCircle,
      members: membersWithIssues.critical,
    },
    {
      id: 'no-emergency-contact',
      title: 'No Emergency Contact',
      description: 'Members without an emergency contact defined',
      count: counts.noEmergencyContact,
      severity: 'critical' as const,
      icon: AlertCircle,
      members: membersWithIssues.critical,
    },
    {
      id: 'missing-doctor-info',
      title: 'Missing Doctor Info',
      description: 'Members without medical practice details',
      count: counts.missingDoctorInfo,
      severity: 'medium' as const,
      icon: AlertTriangle,
      members: membersWithIssues.medium,
    },
    {
      id: 'duplicate-emergency-contact',
      title: 'Duplicate Emergency Contact',
      description: 'Emergency contact same as another contact',
      count: counts.duplicateEmergencyContact,
      severity: 'medium' as const,
      icon: AlertTriangle,
      members: membersWithIssues.medium,
    },
    {
      id: 'missing-member-contact',
      title: 'Missing Member Contact',
      description: "Member's own email or phone missing",
      count: counts.missingMemberContact,
      severity: 'medium' as const,
      icon: AlertTriangle,
      members: membersWithIssues.medium,
    },
    {
      id: 'missing-photo-consent',
      title: 'Missing Photo Consent',
      description: 'Photo consent not recorded',
      count: counts.missingPhotoConsent,
      severity: 'low' as const,
      icon: Info,
      members: membersWithIssues.low,
    },
    {
      id: 'missing-medical-consent',
      title: 'Missing Medical Consent',
      description: 'Medical consent not recorded',
      count: counts.missingMedicalConsent,
      severity: 'low' as const,
      icon: Info,
      members: membersWithIssues.low,
    },
  ].filter((issue) => issue.count > 0)

  const borderColors = {
    critical: 'border-l-destructive',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
  }

  const iconColors = {
    critical: 'text-destructive',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Custom data loading</p>
          <p className="text-sm text-muted-foreground">
            {pendingMembers.length === 0
              ? 'All members already have contact, medical, and consent details.'
              : `${pendingMembers.length} member${pendingMembers.length === 1 ? '' : 's'} still need custom data.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!isAdmin || pendingMembers.length === 0 || bulkStatus === 'loading'}
            onClick={handleLoadAll}
            size="sm"
            className="min-w-[120px]"
          >
            {bulkStatus === 'loading' ? 'Loading…' : 'Load data'}
          </Button>
          {bulkStatus === 'loading' ? (
            <p className="text-xs text-muted-foreground">
              Loading {bulkProgress.completed}/{bulkProgress.total}
            </p>
          ) : null}
          {bulkStatus === 'success' ? (
            <p className="text-xs text-emerald-600">Finished loading custom data.</p>
          ) : null}
          {bulkStatus === 'error' ? (
            <p className="text-xs text-destructive">Error: {bulkError ?? 'Unknown error'}</p>
          ) : null}
          {!isAdmin ? (
            <p className="text-xs text-muted-foreground">
              Only administrators can load detailed data.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Member Data Issues</h2>
        <p className="text-sm text-muted-foreground">
          {membersWithIssues.all.length} of {members.length} members have data quality issues.
          Click on each section to view details.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {issueDefinitions.map((issue) => {
          const Icon = issue.icon
          return (
            <AccordionItem
              key={issue.id}
              value={issue.id}
              className={`border ${borderColors[issue.severity]} border-l-4 rounded-lg`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${iconColors[issue.severity]}`} />
                    <div className="text-left">
                      <div className="font-medium">{issue.title}</div>
                      <div className="text-xs text-muted-foreground">{issue.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={issue.severity} />
                    <div className="text-sm font-semibold">
                      {issue.count} {issue.count === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <SortableTable members={issue.members} issueType={issue.id} />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
