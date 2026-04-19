
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Link className="brand-title" href="/feed">
            Science Platform
          </Link>
          <span className="brand-copy">Communities, workspaces, collaboration, live calls, AI, and premium science tools.</span>
        </div>

        <nav className="nav">
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
        </nav>

        <div style={{ marginTop: "2rem" }} className="row">
          <UserButton />
          <Link className="button secondary" href="/">
            Public site
          </Link>
        </div>
      </aside>

      <main className="main stack">
        <section className="platform-topbar">
          <div className="stack" style={{ gap: "0.2rem" }}>
            <span className="muted">Science Platform app</span>
            <strong>Collaboration workspace</strong>
          </div>
          <div className="row wrap">
            <input className="platform-search" placeholder="Search posts, groups, resources, people..." />
            <Link className="button secondary" href="/events">Create event</Link>
            <Link className="button secondary" href="/groups">New group</Link>
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
