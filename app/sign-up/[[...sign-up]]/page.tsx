import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";
import { isClerkConfigured } from "@/lib/auth-config";

export default function SignUpPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section">
        <div className="grid two">
          <section className="card stack">
            <SectionHeader
              badge="Create your account"
              title="Join the science network built for real progress"
              copy="Start free and unlock communities, study groups, AI support, events, and expert collaboration."
            />
            <ul className="clean-list">
              <li>Build a science profile and find your people</li>
              <li>Join focused communities and study groups</li>
              <li>Collaborate in labs, workspaces, and calls</li>
            </ul>
            <p className="muted">Already have an account? <Link href="/sign-in">Sign in</Link>.</p>
          </section>

          <section className="card auth-card">
            {isClerkConfigured ? (
              <SignUp />
            ) : (
              <div className="stack">
                <h3>Authentication is not configured yet</h3>
                <p className="muted">Add Clerk publishable and secret keys to enable Sign Up.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
