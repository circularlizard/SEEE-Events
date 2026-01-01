'use client'

import { Users as UsersIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useConsolidatedAttendance } from '@/components/domain/consolidated-attendance/useConsolidatedAttendance'
import { ConsolidatedAttendancePanel } from '@/components/domain/consolidated-attendance/ConsolidatedAttendancePanel'

export default function AttendanceByPersonPage() {
  const { attendees, getPatrolName } = useConsolidatedAttendance()

  return (
    <div className={cn('p-4 md:p-6')}>
      <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" aria-hidden />
            <span>Attendance by Person</span>
          </h1>
        </div>
      </div>

      <ConsolidatedAttendancePanel attendees={attendees} getPatrolName={getPatrolName} />
    </div>
  )
}
