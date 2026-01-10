import { MemberIssuesClient } from '@/app/dashboard/(planning)/members/issues/MemberIssuesClient'

export default async function DataQualityMemberIssuesPage() {

  return (
    <div className="p-4 md:p-6 space-y-6">
      <MemberIssuesClient />
    </div>
  )
}
