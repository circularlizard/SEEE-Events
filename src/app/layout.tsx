import type { Metadata } from 'next'
import './globals.css'
import { Gabarito } from 'next/font/google'
import { MSWProvider } from '@/components/MSWProvider'
import { SessionProvider } from '@/components/SessionProvider'
import { QueryProvider } from '@/components/QueryProvider'
import StartupInitializer from '@/components/StartupInitializer'
import ClientShell from '@/components/layout/ClientShell'

const gabarito = Gabarito({
  subsets: ['latin'],
  variable: '--font-gabarito',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

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
    <html lang="en" className={gabarito.variable}>
      <body className="bg-background text-foreground font-sans antialiased">
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
