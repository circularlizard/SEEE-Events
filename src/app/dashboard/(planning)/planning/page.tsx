import type { AppKey } from '@/types/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const requiredApp: AppKey = 'planning'

export default function PlanningHomePage() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-semibold">Planning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Planning workspace is under construction.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
