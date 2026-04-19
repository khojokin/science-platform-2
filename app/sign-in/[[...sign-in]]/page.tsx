import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";
import { isClerkConfigured } from "@/lib/auth-config";

export default function SignInPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section">
        <div className="grid two">
          <section className="card stack">
            <SectionHeader
              badge="Welcome back"
              title="Sign in to continue your science workflow"
              copy="Access your communities, groups, recordings, and collaboration tools."
            />
            <ul className="clean-list">
              <li>Resume study groups and active threads</li>
              <li>Check event reminders and notifications</li>
              <li>Continue AI copilot learning sessions</li>
            </ul>
            <p className="muted">New here? <Link href="/sign-up">Create an account</Link>.</p>
          </section>

          <section className="card auth-card">
            {isClerkConfigured ? (
              <SignIn />
            ) : (
              <div className="stack">
                <h3>Authentication is not configured yet</h3>
                <p className="muted">Add Clerk publishable and secret keys to enable Sign In.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
