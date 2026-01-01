'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar } from 'lucide-react'
import Link from 'next/link'

interface UnitSummaryCardProps {
  unitName: string
  peopleCount: number
  eventCount: number
  href: string
}

export function UnitSummaryCard({ unitName, peopleCount, eventCount, href }: UnitSummaryCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3 truncate" title={unitName}>
            {unitName}
          </h3>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              <span>
                {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden />
              <span>
                {eventCount} {eventCount === 1 ? 'event' : 'events'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
