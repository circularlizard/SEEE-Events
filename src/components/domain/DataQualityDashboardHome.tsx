'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, AlertTriangle, Loader2, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMembers } from '@/hooks/useMembers'
import { useStore } from '@/store/use-store'

function MemberCountTile() {
  const { members, isLoading, isFetching, loadMissingMemberCustomData } = useMembers()
  const dataSourceProgress = useStore((state) => state.dataSourceProgress.members)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [loadProgress, setLoadProgress] = useState({ total: 0, completed: 0 })
  
  const loading = isLoading || isFetching
  
  const stats = useMemo(() => {
    const total = members.length
    const fullyLoaded = members.filter(m => m.loadingState === 'complete').length
    const withErrors = members.filter(m => m.loadingState === 'error').length
    const pending = total - fullyLoaded - withErrors
    
    return { total, fullyLoaded, withErrors, pending }
  }, [members])

  const getStatusText = () => {
    if (loading && stats.total === 0) {
      return 'Loading member list...'
    }
    if (dataSourceProgress?.state === 'loading') {
      return dataSourceProgress.phase || 'Loading...'
    }
    if (stats.total === 0) {
      return 'No members loaded'
    }
    if (stats.fullyLoaded === stats.total) {
      return 'All member data loaded'
    }
    if (stats.pending > 0) {
      return `${stats.fullyLoaded}/${stats.total} members fully loaded`
    }
    return `${stats.total} members loaded`
  }

  const handleLoadData = async () => {
    setIsLoadingData(true)
    try {
      await loadMissingMemberCustomData({
        onProgress: (progress) => setLoadProgress(progress),
      })
    } catch (error) {
      console.error('Failed to load member data:', error)
    } finally {
      setIsLoadingData(false)
      setLoadProgress({ total: 0, completed: 0 })
    }
  }

  const pendingCount = useMemo(() => {
    return members.filter(m => m.loadingState !== 'complete' && m.loadingState !== 'error').length
  }, [members])

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardDescription className="text-xs uppercase tracking-wide font-medium">
                Member Records
              </CardDescription>
              {loading && stats.total === 0 ? (
                <Skeleton className="h-10 w-32 mt-1" />
              ) : (
                <CardTitle className="text-4xl font-bold mt-1">
                  {stats.total.toLocaleString()}
                </CardTitle>
              )}
            </div>
          </div>
          {(loading || dataSourceProgress?.state === 'loading') && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {getStatusText()}
          </p>
          
          {stats.total > 0 && stats.pending > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(stats.fullyLoaded / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {Math.round((stats.fullyLoaded / stats.total) * 100)}%
              </span>
            </div>
          )}
          
          {stats.withErrors > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.withErrors} {stats.withErrors === 1 ? 'member' : 'members'} with loading errors
            </p>
          )}

          {pendingCount > 0 && (
            <Button 
              onClick={handleLoadData}
              disabled={isLoadingData}
              className="w-full mt-2"
              size="sm"
            >
              {isLoadingData ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading {loadProgress.completed}/{loadProgress.total}...
                </>
              ) : (
                <>Load Additional Member Data</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function NavigationTile() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Members List
          </CardTitle>
          <CardDescription className="text-xs">
            View all members and their loading status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/data-quality/members">
            <Button className="w-full" variant="default">
              View Members
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Data Issues
          </CardTitle>
          <CardDescription className="text-xs">
            Review and address data quality issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/data-quality/members/issues">
            <Button className="w-full" variant="default">
              View Issues
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export function DataQualityDashboardHome() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Data Quality Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage member data quality for your section
        </p>
      </div>
      
      <div className="space-y-6">
        <MemberCountTile />
        <NavigationTile />
      </div>
    </div>
  )
}
