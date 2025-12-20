'use client'

import { useMemo } from 'react'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useMembers } from '@/hooks/useMembers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getMemberIssues,
  getMembersWithIssues,
  getIssueCounts,
  type MemberIssue,
} from '@/lib/member-issues'
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

function IssueCard({
  title,
  description,
  count,
  severity,
  icon: Icon,
}: {
  title: string
  description: string
  count: number
  severity: 'critical' | 'medium' | 'low'
  icon: typeof AlertCircle
}) {
  const borderColors = {
    critical: 'border-destructive',
    medium: 'border-yellow-500',
    low: 'border-blue-500',
  }

  return (
    <Card className={`${borderColors[severity]} border-l-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          <SeverityBadge severity={severity} />
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {count === 1 ? 'member affected' : 'members affected'}
        </p>
      </CardContent>
    </Card>
  )
}

function IssueTable({
  members,
  issueType,
  title,
}: {
  members: NormalizedMember[]
  issueType: string
  title: string
}) {
  const membersWithIssue = members.filter((m) => {
    const issues = getMemberIssues(m)
    return issues.some((i) => i.type === issueType)
  })

  if (membersWithIssue.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Patrol</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Issue Details</th>
            </tr>
          </thead>
          <tbody>
            {membersWithIssue.map((member) => {
              const issues = getMemberIssues(member)
              const issue = issues.find((i) => i.type === issueType)

              let issueDetails = issue?.description || ''
              if (issue?.missingFields && issue.missingFields.length > 0) {
                issueDetails += ` (Missing: ${issue.missingFields.join(', ')})`
              }
              if (issue?.duplicateContact) {
                issueDetails += ` (Same as ${issue.duplicateContact})`
              }

              return (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm">
                    {member.lastName}, {member.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm">{member.patrolName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{issueDetails}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MemberIssuesClient() {
  const { members } = useMembers()

  const { counts, membersWithIssues } = useMemo(() => {
    const counts = getIssueCounts(members)
    const membersWithIssues = getMembersWithIssues(members)
    return { counts, membersWithIssues }
  }, [members])

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <IssueCard
            title="No Contact Information"
            description="Members with no contact details at all"
            count={counts.noContactInfo}
            severity="critical"
            icon={AlertCircle}
          />
          <IssueCard
            title="No Email or Phone"
            description="Members with no email address or phone number"
            count={counts.noEmailOrPhone}
            severity="critical"
            icon={AlertCircle}
          />
          <IssueCard
            title="No Emergency Contact"
            description="Members without an emergency contact defined"
            count={counts.noEmergencyContact}
            severity="critical"
            icon={AlertCircle}
          />
          <IssueCard
            title="Missing Doctor Info"
            description="Members without medical practice details"
            count={counts.missingDoctorInfo}
            severity="medium"
            icon={AlertTriangle}
          />
          <IssueCard
            title="Duplicate Emergency Contact"
            description="Emergency contact same as another contact"
            count={counts.duplicateEmergencyContact}
            severity="medium"
            icon={AlertTriangle}
          />
          <IssueCard
            title="Missing Member Contact"
            description="Member's own email or phone missing"
            count={counts.missingMemberContact}
            severity="medium"
            icon={AlertTriangle}
          />
          <IssueCard
            title="Missing Photo Consent"
            description="Photo consent not recorded"
            count={counts.missingPhotoConsent}
            severity="low"
            icon={Info}
          />
          <IssueCard
            title="Missing Medical Consent"
            description="Medical consent not recorded"
            count={counts.missingMedicalConsent}
            severity="low"
            icon={Info}
          />
        </div>
      </div>

      {membersWithIssues.critical.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold">Critical Issues</h2>
            <SeverityBadge severity="critical" />
          </div>
          <IssueTable
            members={membersWithIssues.critical}
            issueType="no-contact-info"
            title="No Contact Information"
          />
          <IssueTable
            members={membersWithIssues.critical}
            issueType="no-email-or-phone"
            title="No Email or Phone"
          />
          <IssueTable
            members={membersWithIssues.critical}
            issueType="no-emergency-contact"
            title="No Emergency Contact"
          />
        </div>
      )}

      {membersWithIssues.medium.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Medium Issues</h2>
            <SeverityBadge severity="medium" />
          </div>
          <IssueTable
            members={membersWithIssues.medium}
            issueType="missing-doctor-info"
            title="Missing Doctor Information"
          />
          <IssueTable
            members={membersWithIssues.medium}
            issueType="duplicate-emergency-contact"
            title="Duplicate Emergency Contact"
          />
          <IssueTable
            members={membersWithIssues.medium}
            issueType="missing-member-contact"
            title="Missing Member Contact Details"
          />
        </div>
      )}

      {membersWithIssues.low.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Low Priority Issues</h2>
            <SeverityBadge severity="low" />
          </div>
          <IssueTable
            members={membersWithIssues.low}
            issueType="missing-photo-consent"
            title="Missing Photo Consent"
          />
          <IssueTable
            members={membersWithIssues.low}
            issueType="missing-medical-consent"
            title="Missing Medical Consent"
          />
        </div>
      )}
    </div>
  )
}
