import { redirect } from 'next/navigation'
import type { AppKey } from '@/types/app'

export const requiredApp: AppKey = 'multi'

/**
 * Multi-Section Viewer Events Page
 * 
 * Redirects to the main events list page which is shared across apps.
 * The multi-section viewer keeps the section selector enabled, allowing
 * users to view events across multiple sections.
 * 
 * TODO: Implement osm-multisection provider for proper multi-section OAuth scopes.
 * See docs/future/platform-strategy-analysis.md §6 for generalized hydrator design.
 * This is currently a placeholder guarded by the multi app selection.
 */
export default function MultiSectionEventsPage() {
  redirect('/dashboard/events')
}
