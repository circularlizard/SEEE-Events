'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { usePatrolMap, usePatrolRefresh } from '@/hooks/usePatrolMap'
import { RefreshCw, Users, Clock, AlertCircle, ChevronDown } from 'lucide-react'

/**
 * Format date for display
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Patrol Management component for admin page
 * Displays cached patrol data and allows refresh
 */
export function PatrolManagement() {
  const { patrols, meta, isLoading, error } = usePatrolMap()
  const { refresh, isRefreshing, error: refreshError, lastResult } = usePatrolRefresh()

  // Group patrols by section for display
  const patrolsBySection = useMemo(
    () =>
      patrols.reduce<Record<string, typeof patrols>>((acc, patrol) => {
        const key = patrol.sectionName || patrol.sectionId
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(patrol)
        return acc
      }, {}),
    [patrols],
  )

  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionKey)) {
        next.delete(sectionKey)
      } else {
        next.add(sectionKey)
      }
      return next
    })
  }

  const expandAll = () => {
    const allKeys = new Set<string>()
    patrols.forEach((patrol) => {
      const key = patrol.sectionId || patrol.sectionName
      if (key) {
        allKeys.add(key)
      }
    })
    setOpenSections(allKeys)
  }

  const collapseAll = () => {
    setOpenSections(new Set())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patrol Reference Data
            </CardTitle>
            <CardDescription className="mt-1">
              Cached patrol names used throughout the dashboard
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => refresh()}
              disabled={isRefreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Patrol Data'}
            </Button>
            {!isLoading && patrols.length > 0 && (
              <div className="flex gap-2 text-xs text-primary">
                <button type="button" onClick={expandAll} className="hover:underline">
                  Expand all
                </button>
                <span className="text-muted-foreground">|</span>
                <button type="button" onClick={collapseAll} className="hover:underline">
                  Collapse all
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metadata */}
        {meta && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Last updated: {formatDate(meta.lastUpdated)}</span>
            </div>
            <div>
              <span>by {meta.updatedBy}</span>
            </div>
            <div className="ml-auto">
              <span>{meta.patrolCount} patrols across {meta.sectionCount} sections</span>
            </div>
          </div>
        )}

        {/* Errors */}
        {(error || refreshError || lastResult?.errors) && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {error ? 'Failed to load patrol data' : 'Some errors occurred during refresh'}
            </div>
            {lastResult?.errors && (
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {lastResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && patrols.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No patrol data cached</p>
            <p className="text-sm mt-1">Click &quot;Refresh Patrol Data&quot; to load patrol information from OSM</p>
          </div>
        )}

        {/* Patrol table grouped by section in collapsible panels */}
        {!isLoading && patrols.length > 0 && (
          <div className="space-y-2">
            {Object.entries(patrolsBySection).map(([sectionName, sectionPatrols]) => {
              const first = sectionPatrols[0]
              const displayName = first?.sectionName || sectionName
              const sectionLabel = `${displayName} (${sectionPatrols.length} patrol${sectionPatrols.length === 1 ? '' : 's'})`
              const sectionKey = first?.sectionId ?? sectionName

              return (
                <Collapsible
                  key={sectionKey}
                  open={openSections.has(sectionKey)}
                  onOpenChange={() => toggleSection(sectionKey)}
                  className="border rounded-lg"
                >
                  <div className="flex items-center justify-between bg-muted px-3 py-2 border-b">
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold">
                      <ChevronDown className="h-4 w-4" aria-hidden />
                      <span>{sectionLabel}</span>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="table w-full text-sm">
                      <div className="table-header-group bg-muted/60">
                        <div className="table-row">
                          <div className="table-cell p-3 font-semibold text-left">Patrol ID</div>
                          <div className="table-cell p-3 font-semibold text-left">Patrol Name</div>
                        </div>
                      </div>
                      <div className="table-row-group">
                        {sectionPatrols.map((patrol) => (
                          <div
                            key={`${patrol.sectionId}-${patrol.patrolId}`}
                            className="table-row border-t hover:bg-muted/50 transition-colors"
                          >
                            <div className="table-cell p-3 font-mono text-muted-foreground">
                              {patrol.patrolId}
                            </div>
                            <div className="table-cell p-3 font-medium">
                              {patrol.patrolName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
