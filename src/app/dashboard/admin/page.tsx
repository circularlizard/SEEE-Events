import { getServerSession } from 'next-auth/next'
import Link from 'next/link'
import { getAuthConfig } from '@/lib/auth'

export default async function AdminPage() {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)
  const role = (session as any)?.roleSelection

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
    <div className="p-6">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin tools will appear here in Phase 4.
      </p>
    </div>
  )
}