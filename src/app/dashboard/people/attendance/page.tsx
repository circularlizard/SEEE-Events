'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function AttendanceByPersonPage() {
  const [groupMode, setGroupMode] = useState<'single' | 'patrol'>('single')

  return (
    <div className={cn('p-4 md:p-6')}>
      <Card>
        <CardHeader>
          <CardTitle className={cn('text-2xl md:text-3xl font-semibold')}>Attendance by Person</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={groupMode} onValueChange={(v) => setGroupMode(v as 'single' | 'patrol')}>
            <TabsList>
              <TabsTrigger value="single">Single List</TabsTrigger>
              <TabsTrigger value="patrol">Group by Patrol</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4 text-sm text-muted-foreground">
            {/* TODO: Wire data from usePerPersonAttendance (aggregated from summaries) */}
            <p>Coming soon: people with their “Yes” events{groupMode === 'patrol' ? ' grouped by patrol' : ''}.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
