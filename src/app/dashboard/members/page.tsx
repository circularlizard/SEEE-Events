import { getServerSession } from 'next-auth/next'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { getAuthConfig } from '@/lib/auth'
import { MembersClient } from './MembersClient'

export default async function MembersPage() {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)
  // roleSelection is added to session by our JWT callback
  const role = (session as { roleSelection?: string } | null)?.roleSelection

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access Members.
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
            data-testid="members-title"
          >
            <Users className="h-6 w-6" aria-hidden />
            <span>Members</span>
          </h1>
          <p className="mt-1 text-sm md:text-base opacity-90">
            View and manage member information for the selected section
          </p>
        </div>
      </div>
      
      <MembersClient />
    </div>
  )
}
