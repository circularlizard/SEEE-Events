import { getServerSession } from 'next-auth/next'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { getAuthConfig } from '@/lib/auth'
import { MemberIssuesClient } from './MemberIssuesClient'

export default async function MemberIssuesPage() {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)
  const role = (session as { roleSelection?: string } | null)?.roleSelection

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access Member Data Issues.
        </p>
        <div className="mt-4">
          <Link href="/dashboard" className="underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
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
      </div>
      
      <MemberIssuesClient />
    </div>
  )
}
