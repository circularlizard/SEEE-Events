'use client'

import { UnitAttendanceDetail } from '@/components/domain/consolidated-attendance/UnitAttendanceDetail'

interface PlannerUnitAttendancePageProps {
  params: { unitId: string }
}

export default function PlannerUnitAttendancePage({ params }: PlannerUnitAttendancePageProps) {
  const unitId = decodeURIComponent(params.unitId)
  return (
    <UnitAttendanceDetail
      unitId={unitId}
      overviewHref="/dashboard/planning/events/attendance"
      eventDetailBaseHref="/dashboard/planning/events"
    />
  )
}
