'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type OAuthData = Record<string, unknown>

export default function OAuthResourceDebugPage() {
  const [data, setData] = useState<OAuthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/oauth-data')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Some handlers wrap data; show full payload
      setData(json)
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[OAuthResourceDebug] Fetched oauth-data:', json)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl md:text-3xl font-semibold">OAuth Resource (cached)</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </Button>
              <Button variant="secondary" onClick={() => setData(null)}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 mb-3">Error: {error}</div>}
          {!data && !loading && (
            <div className="text-muted-foreground">No data loaded. Use Refresh.</div>
          )}
          {data && (
            <details open className="mt-2">
              <summary className="cursor-pointer">Raw JSON</summary>
              <pre className="mt-2 overflow-auto text-xs p-3 bg-muted rounded">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
