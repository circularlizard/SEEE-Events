import { Users } from 'lucide-react'
import { MembersClient } from '@/app/dashboard/(planning)/members/MembersClient'

export default async function DataQualityMembersPage() {

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold flex items-center gap-2"
            data-testid="dq-members-title"
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
