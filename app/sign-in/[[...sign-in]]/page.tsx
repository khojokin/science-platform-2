import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="container" style={{ paddingBlock: "3rem" }}>
      <div className="card" style={{ maxWidth: 480, marginInline: "auto" }}>
        <SignIn />
      </div>
    </main>
  );
}
