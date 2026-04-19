import { SignInClient } from "@/components/auth/sign-in-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function SignInPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section auth-wrap">
        <SignInClient />
      </main>
    </MarketingShell>
  );
}
