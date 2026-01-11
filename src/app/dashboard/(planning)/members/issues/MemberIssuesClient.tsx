'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { useMembers } from '@/hooks/useMembers'
import { getMemberIssues, getMembersWithIssues, getIssueCounts } from '@/lib/member-issues'
import type { NormalizedMember } from '@/lib/schemas'
import { useExportViewContext, createExportColumn } from '@/hooks/useExportContext'
import type { ExportColumn, ExportRow, ExportFormat } from '@/lib/export'
import { executeExport } from '@/lib/export'
import { useStore } from '@/store/use-store'
import { Download, FileSpreadsheet, FileText, Users, ListChecks, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  basePath: string
}

function SortableTable({ members, issueType, basePath }: SortableTableProps) {
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

  const detailHref = (id: string) => `${basePath}/${encodeURIComponent(id)}?from=issues`

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
  const { members, loadMissingMemberCustomData } = useMembers()
  const currentApp = useStore((s) => s.currentApp)
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 })

  // Determine the base path for member detail links based on current app
  const membersBasePath = useMemo(() => {
    if (currentApp === 'data-quality') {
      return '/dashboard/data-quality/members'
    }
    return '/dashboard/planning/members'
  }, [currentApp])

  const pendingMembers = useMemo(
    () => members.filter((member) => member.loadingState !== 'complete' && member.loadingState !== 'error'),
    [members]
  )

  const { counts, membersWithIssues } = useMemo(() => {
    const counts = getIssueCounts(members)
    const membersWithIssues = getMembersWithIssues(members)
    return { counts, membersWithIssues }
  }, [members])

  // Issue type to human-readable title mapping
  const issueLabels = useMemo<Record<string, string>>(() => ({
    'no-contact-info': 'No Contact Information',
    'no-email-or-phone': 'No Email or Phone',
    'no-emergency-contact': 'No Emergency Contact',
    'no-primary-contacts-under-18': 'No Primary Contact (Under 18)',
    'missing-doctor-info': 'Missing Doctor Info',
    'duplicate-emergency-contact': 'Duplicate Emergency Contact',
    'missing-member-contact': 'Missing Member Contact',
    'missing-photo-consent': 'Missing Photo Consent',
    'missing-medical-consent': 'Missing Medical Consent',
  }), [])

  // Export Option 1: By Issue (for each issue, list members) (REQ-DQ-04)
  const byIssueColumns = useMemo<ExportColumn[]>(() => [
    createExportColumn('issueType', 'Issue Type', 'string'),
    createExportColumn('severity', 'Severity', 'string'),
    createExportColumn('memberName', 'Member Name', 'string'),
    createExportColumn('patrol', 'Patrol', 'string'),
    createExportColumn('issueDetails', 'Issue Details', 'string'),
  ], [])

  const byIssueRows = useMemo<ExportRow[]>(() => {
    const rows: ExportRow[] = []
    const severityOrder = { critical: 0, medium: 1, low: 2 }

    for (const member of membersWithIssues.all) {
      const issues = getMemberIssues(member)
      for (const issue of issues) {
        let details = issue.description
        if (issue.missingFields?.length) {
          details += ` (Missing: ${issue.missingFields.join(', ')})`
        }
        if (issue.duplicateContact) {
          details += ` (Same as ${issue.duplicateContact})`
        }

        rows.push({
          issueType: issueLabels[issue.type] || issue.type,
          severity: issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1),
          memberName: `${member.lastName}, ${member.firstName}`,
          patrol: member.patrolName,
          issueDetails: details,
          _sortSeverity: severityOrder[issue.severity] ?? 3,
        })
      }
    }

    // Sort by issue type, then severity, then member name
    rows.sort((a, b) => {
      const issueCmp = String(a.issueType).localeCompare(String(b.issueType))
      if (issueCmp !== 0) return issueCmp
      const sevA = (a._sortSeverity as number) ?? 3
      const sevB = (b._sortSeverity as number) ?? 3
      if (sevA !== sevB) return sevA - sevB
      return String(a.memberName).localeCompare(String(b.memberName))
    })

    // Remove sort helper field
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return rows.map(({ _sortSeverity, ...rest }) => rest)
  }, [membersWithIssues.all, issueLabels])

  // Export Option 2: By Member (for each member, list issues) (REQ-DQ-04)
  const byMemberColumns = useMemo<ExportColumn[]>(() => [
    createExportColumn('memberName', 'Member Name', 'string'),
    createExportColumn('patrol', 'Patrol', 'string'),
    createExportColumn('issueCount', 'Issue Count', 'number'),
    createExportColumn('criticalIssues', 'Critical Issues', 'string'),
    createExportColumn('mediumIssues', 'Medium Issues', 'string'),
    createExportColumn('lowIssues', 'Low Issues', 'string'),
  ], [])

  const byMemberRows = useMemo<ExportRow[]>(() => {
    const rows: ExportRow[] = []

    for (const member of membersWithIssues.all) {
      const issues = getMemberIssues(member)
      const critical = issues.filter((i) => i.severity === 'critical').map((i) => issueLabels[i.type] || i.type)
      const medium = issues.filter((i) => i.severity === 'medium').map((i) => issueLabels[i.type] || i.type)
      const low = issues.filter((i) => i.severity === 'low').map((i) => issueLabels[i.type] || i.type)

      rows.push({
        memberName: `${member.lastName}, ${member.firstName}`,
        patrol: member.patrolName,
        issueCount: issues.length,
        criticalIssues: critical.join(', ') || '—',
        mediumIssues: medium.join(', ') || '—',
        lowIssues: low.join(', ') || '—',
      })
    }

    // Sort by member name
    rows.sort((a, b) => String(a.memberName).localeCompare(String(b.memberName)))

    return rows
  }, [membersWithIssues.all, issueLabels])

  // Create both export contexts (REQ-DQ-04)
  const byIssueContext = useExportViewContext({
    id: 'member-issues-by-issue',
    title: 'Data Issues Report - By Issue Type',
    columns: byIssueColumns,
    rows: byIssueRows,
  })

  const byMemberContext = useExportViewContext({
    id: 'member-issues-by-member',
    title: 'Data Issues Report - By Member',
    columns: byMemberColumns,
    rows: byMemberRows,
  })

  const handleLoadAll = async () => {
    if (pendingMembers.length === 0) return

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

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (
    context: ReturnType<typeof useExportViewContext>,
    format: ExportFormat
  ) => {
    setIsExporting(true)
    try {
      await executeExport(context, format)
    } finally {
      setIsExporting(false)
    }
  }

  const hasIssues = membersWithIssues.all.length > 0

  // Header component with export dropdown
  const header = (
    <div className="rounded-lg bg-primary text-primary-foreground px-4 py-4 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold flex items-center gap-2"
            data-testid="member-issues-title"
          >
            <AlertTriangle className="h-6 w-6" aria-hidden />
            <span>Member Data Issues</span>
          </h1>
          <p className="mt-1 text-sm md:text-base opacity-90">
            Review and address data quality issues for members in the selected section
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="self-start border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
              disabled={!hasIssues || isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Issues Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListChecks className="h-4 w-4 mr-2" />
                By Issue Type
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleExport(byIssueContext, 'xlsx')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Spreadsheet (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(byIssueContext, 'pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Document (.pdf)
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Users className="h-4 w-4 mr-2" />
                By Member
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleExport(byMemberContext, 'xlsx')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Spreadsheet (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(byMemberContext, 'pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Document (.pdf)
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {byMemberRows.length} members with {byIssueRows.length} issues
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (members.length === 0) {
    return (
      <>
        {header}
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No members loaded. Please select a section to view member data issues.
          </p>
        </div>
      </>
    )
  }

  if (membersWithIssues.all.length === 0) {
    return (
      <>
        {header}
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <Info className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Issues Found</h2>
          <p className="text-muted-foreground">
            All {members.length} members have complete data. Great work!
          </p>
        </div>
      </>
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
      id: 'no-primary-contacts-under-18',
      title: 'No Primary Contact (Under 18)',
      description: 'Under 18 members missing both primary contacts',
      count: counts.noPrimaryContactsForMinors,
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
    <>
      {header}
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
            disabled={pendingMembers.length === 0 || bulkStatus === 'loading'}
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
                <SortableTable members={issue.members} issueType={issue.id} basePath={membersBasePath} />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      </div>
    </>
  )
}
