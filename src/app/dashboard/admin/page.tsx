import { getServerSession } from 'next-auth/next'
import Link from 'next/link'
import { getAuthConfig } from '@/lib/auth'
import { PatrolManagement } from './PatrolManagement'

export default async function AdminPage() {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)
  // roleSelection is added to session by our JWT callback
  const role = (session as { roleSelection?: string } | null)?.roleSelection

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access Admin.
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="admin-title">Admin</h1>
        <p className="text-muted-foreground mt-1">
          Manage system settings and reference data
        </p>
      </div>
      
      <PatrolManagement />
    </div>
  )
}