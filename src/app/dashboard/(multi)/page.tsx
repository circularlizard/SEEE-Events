import Link from 'next/link'
import { Users, Calendar, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { AppKey } from '@/types/app'

export const requiredApp: AppKey = 'multi'

/**
 * Multi-Section Viewer Dashboard
 * 
 * This is a placeholder implementation of the Multi-Section Viewer app.
 * It reuses Expedition Viewer components but keeps the section selector enabled,
 * allowing users to view data across multiple sections.
 * 
 * TODO: Implement osm-multisection OAuth provider with proper multi-section scopes.
 * See docs/future/platform-strategy-analysis.md §6 for generalized hydrator design.
 * 
 * Current limitations:
 * - Uses standard OAuth scopes (OSM enforces section-level access control)
 * - No dedicated multi-section hydration strategy yet
 * - Access control relies on OSM's built-in section permissions
 */
export default function MultiSectionDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="rounded-lg bg-primary text-primary-foreground px-4 py-3">
        <h1 className="text-2xl md:text-3xl font-bold">Multi-Section Viewer</h1>
        <p className="mt-1 text-sm md:text-base opacity-90">
          View events, members, and attendance across multiple sections
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Preview Feature</AlertTitle>
        <AlertDescription>
          The Multi-Section Viewer is currently in preview. It reuses Expedition Viewer components
          with the section selector enabled. Full multi-section OAuth provider and generalized
          hydrators are planned for a future release.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events
            </CardTitle>
            <CardDescription>
              View events and attendance across your accessible sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events">
              <Button className="w-full">View Events</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>
              View member information across your accessible sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members">
              <Button className="w-full">View Members</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted-foreground/20">
        <CardHeader>
          <CardTitle className="text-sm">Technical Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Access Control:</strong> OSM's built-in section permissions enforce which sections
            you can access. The app displays data only for sections you have permission to view.
          </p>
          <p>
            <strong>Section Selector:</strong> Unlike SEEE-specific apps (Planning, Expedition), the
            Multi-Section Viewer keeps the section selector visible, allowing you to switch between
            sections or view multiple sections simultaneously.
          </p>
          <p>
            <strong>Future Enhancements:</strong> A dedicated <code>osm-multisection</code> OAuth provider
            and generalized hydration strategy are planned. See{' '}
            <code>docs/future/platform-strategy-analysis.md §6</code> for details.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
