import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="container" style={{ paddingBlock: "3rem" }}>
      <div className="card" style={{ maxWidth: 480, marginInline: "auto" }}>
        <SignUp />
      </div>
    </main>
  );
}
