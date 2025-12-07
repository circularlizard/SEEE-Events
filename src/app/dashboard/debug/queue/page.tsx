'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/use-store'
import { useEvents } from '@/hooks/useEvents'

export default function QueueDebugPage() {
  const qc = useQueryClient()
  const queueItems = useStore((s) => s.queueItems)
  const queueRunning = useStore((s) => s.queueRunning)
  const queueTimerActive = useStore((s) => s.queueTimerActive)
  const enqueueItems = useStore((s) => s.enqueueItems)
  const clearQueue = useStore((s) => s.clearQueue)
  const { data } = useEvents()

  const summaries = qc.getQueryCache().findAll({ queryKey: ['event-summary'] })
  const loadingIds = summaries.filter((q) => q.state.status === 'loading').map((q) => q.queryKey?.[1])
  const successIds = summaries.filter((q) => q.state.status === 'success').map((q) => q.queryKey?.[1])

  const handleManualEnqueue = () => {
    const items = data?.items ?? []
    const ids = Array.from(new Set(items.map((e: any) => e.eventid)))
    enqueueItems(ids)
  }

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl md:text-3xl font-semibold">Summary Queue Debug</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleManualEnqueue}>Manual Enqueue</Button>
              <Button variant="outline" onClick={clearQueue}>Clear Queue</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 border rounded">
              <h3 className="font-semibold mb-2">Queue State (Live)</h3>
              <div className="text-sm space-y-1">
                <div>Timer Active: {String(queueTimerActive)}</div>
                <div>Running: {queueRunning}</div>
                <div>Queued ({queueItems.length}): {JSON.stringify(queueItems.slice(0, 10))}{queueItems.length > 10 && '...'}</div>
              </div>
            </div>
            <div className="p-3 border rounded">
              <h3 className="font-semibold mb-2">Query Cache</h3>
              <div className="text-sm space-y-1">
                <div>Loading IDs ({loadingIds.length}): {JSON.stringify(loadingIds.slice(0, 5))}{loadingIds.length > 5 && '...'}</div>
                <div>Success IDs ({successIds.length}): {JSON.stringify(successIds.slice(0, 5))}{successIds.length > 5 && '...'}</div>
                <div>Total summaries: {summaries.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
