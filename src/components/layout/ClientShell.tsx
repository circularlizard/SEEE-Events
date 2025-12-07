"use client";
import { useSession } from "next-auth/react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SummaryQueueBanner from "./SummaryQueueBanner";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  // Only render the full application chrome when authenticated.
  // Hide during loading state to prevent flash of navigation on login page
  if (status === "loading" || status === "unauthenticated") {
    return <main className="min-h-screen">{children}</main>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SummaryQueueBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
