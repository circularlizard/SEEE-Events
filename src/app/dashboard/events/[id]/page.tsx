import { getServerSession } from 'next-auth'
import { getAuthConfig } from '@/lib/auth'
import EventDetailClient from './EventDetailClient'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)

  if (!session) {
    // Let middleware handle redirects; render nothing
    return null
  }

  const { id } = await params
  const eventId = Number(id)

  return <EventDetailClient eventId={eventId} />
}
