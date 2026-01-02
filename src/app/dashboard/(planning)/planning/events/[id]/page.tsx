import { getServerSession } from 'next-auth'
import { getAuthConfig } from '@/lib/auth'
import EventDetailClient from '@/app/dashboard/(expedition)/events/[id]/EventDetailClient'

interface PlannerEventDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PlannerEventDetailPage({ params }: PlannerEventDetailPageProps) {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  const { id } = await params
  const eventId = Number(id)

  return (
    <EventDetailClient
      eventId={eventId}
      backHref="/dashboard/planning/events"
      attendanceHrefBase="/dashboard/planning/events/attendance"
    />
  )
}
