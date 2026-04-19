import { SignUpClient } from "@/components/auth/sign-up-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function SignUpPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section auth-wrap">
        <SignUpClient />
      </main>
    </MarketingShell>
  );
}
