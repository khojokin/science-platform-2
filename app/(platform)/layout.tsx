
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth";
import { isClerkConfigured } from "@/lib/auth-config";
import { NavLink } from "@/components/nav-link";

export default async function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isClerkConfigured) {
    redirect("/");
  }

  await ensureProfile();

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <div className="platform-header-inner container">
          <Link className="nav-brand" href="/feed">
            <span className="brand-dot" />
            SciSphere App
          </Link>

          <input className="platform-search" placeholder="Search posts, groups, resources, people..." />

          <details className="platform-menu">
            <summary>Menu</summary>
            <div className="platform-menu-panel nav">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/onboarding" label="Onboarding" />
              <NavLink href="/feed" label="Feed" />
              <NavLink href="/communities" label="Communities" />
              <NavLink href="/workspaces" label="Workspaces" />
              <NavLink href="/search" label="Search" />
              <NavLink href="/groups" label="Study groups" />
              <NavLink href="/labs" label="Labs" />
              <NavLink href="/vault" label="Vault" />
              <NavLink href="/bounties" label="Bounties" />
              <NavLink href="/events" label="Events" />
              <NavLink href="/calendar" label="Calendar" />
              <NavLink href="/calls" label="Calls" />
              <NavLink href="/recordings" label="Recordings" />
              <NavLink href="/messages" label="Messages" />
              <NavLink href="/notifications" label="Notifications" />
              <NavLink href="/experts" label="Experts" />
              <NavLink href="/ambassadors" label="Ambassadors" />
              <NavLink href="/ai" label="AI copilot" />
              <NavLink href="/pricing" label="Pricing" />
              <NavLink href="/profile" label="Profile" />
              <NavLink href="/moderation" label="Moderation" />
              <NavLink href="/ops" label="Ops" />
              <NavLink href="/ops/live" label="Live ops" />
              <NavLink href="/ops/release" label="Release" />
              <NavLink href="/admin" label="Admin" />
            </div>
          </details>

          <div className="row">
            <Link className="button secondary" href="/events">Create event</Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="main stack container">{children}</main>
    </div>
  );
}
