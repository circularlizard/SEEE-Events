import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="hidden md:block w-60 border-r bg-muted min-h-screen p-4">
      <nav className="space-y-2 text-sm">
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="/dashboard">
          Overview
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="/dashboard/events">
          Events
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="#">
          Patrols
        </Link>
        <Link className="block px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground" href="#">
          Readiness
        </Link>
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
