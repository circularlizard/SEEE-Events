'use client'

import { AttendanceOverview } from '@/components/domain/consolidated-attendance/AttendanceOverview'

const buildPlannerUnitHref = (unitId: string) =>
  `/dashboard/planning/events/attendance/${encodeURIComponent(unitId)}`

export default function PlannerAttendanceOverviewPage() {
  return <AttendanceOverview buildUnitHref={buildPlannerUnitHref} />
}
