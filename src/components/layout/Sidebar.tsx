'use client'

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Shield } from 'lucide-react';

export default function Sidebar() {
  const { data: session } = useSession();
  const isAdmin = (session as { roleSelection?: string } | null)?.roleSelection === 'admin';

  return (
    <aside className="hidden md:block w-60 border-r bg-muted min-h-screen p-4">
      <nav className="space-y-2 text-sm">
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="/dashboard">
          Overview
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="/dashboard/events">
          Events
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="/dashboard/people/attendance">
          Attendance by Person
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="#">
          Patrols
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="#">
          Readiness
        </Link>
        
        {/* Admin section - only visible to administrators */}
        {isAdmin && (
          <div className="border-t my-4 pt-4">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">
              Administration
            </p>
            <Link
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground"
              href="/dashboard/admin"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          </div>
        )}
        
        <div className="border-t my-4 pt-4">
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">
            Developer Tools
          </p>
          <Link
            className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            href="/dashboard/api-browser"
          >
            API Browser
          </Link>
          <Link
            className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            href="/dashboard/debug/queue"
          >
            Queue Debug
          </Link>
          <Link
            className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            href="/dashboard/debug/oauth"
          >
            OAuth Resource
          </Link>
          <div className="mt-4">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase mb-2">
              Settings
            </p>
            <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="/dashboard/settings">
              Settings
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  );
}
