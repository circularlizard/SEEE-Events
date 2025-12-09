import type { Metadata } from 'next'
import './globals.css'
import { MSWProvider } from '@/components/MSWProvider'
import { SessionProvider } from '@/components/SessionProvider'
import { QueryProvider } from '@/components/QueryProvider'
import StartupInitializer from '@/components/StartupInitializer'
import ClientShell from '@/components/layout/ClientShell'

export const metadata: Metadata = {
  title: 'SEEE Expedition Dashboard',
  description: 'Scout Event Management Dashboard',
  icons: {
    icon: '/favicon.svg',
  },
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
          <SessionProvider>
            <QueryProvider>
              <StartupInitializer />
              <ClientShell>
                {children}
              </ClientShell>
            </QueryProvider>
          </SessionProvider>
        </MSWProvider>
      </body>
    </html>
  )
}
