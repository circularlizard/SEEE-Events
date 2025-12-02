import type { Metadata } from 'next'
import './globals.css'
import { MSWProvider } from '@/components/MSWProvider'
import { QueryProvider } from '@/components/QueryProvider'

export const metadata: Metadata = {
  title: 'SEEE Expedition Dashboard',
  description: 'Scout Event Management Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <MSWProvider>
          <QueryProvider>{children}</QueryProvider>
        </MSWProvider>
      </body>
    </html>
  )
}
