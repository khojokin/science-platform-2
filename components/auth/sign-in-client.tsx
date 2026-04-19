"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function SocialButton({
  onClick,
  icon,
  label,
  disabled
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="auth-social-button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectParam = String(searchParams?.get("redirect_url") || "").trim();
  const redirectTarget = useMemo(() => {
    if (!redirectParam) return "/feed";
    if (redirectParam.startsWith("/")) return redirectParam;
    return "/feed";
  }, [redirectParam]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWith = async (strategy: "oauth_google" | "oauth_apple") => {
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push(redirectTarget);
    }, strategy === "oauth_google" ? 350 : 420);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Enter your email/username and password.");
      return;
    }

    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      router.push(redirectTarget);
    }, 380);
  };

  return (
    <div className="auth-shell-card">
      <aside className="auth-left-panel">
        <div>
          <p className="auth-brand">SciSphere</p>
          <p className="auth-tagline">WELCOME.BACK</p>
          <h1 className="auth-title">Continue your science workflow.</h1>
          <p className="auth-subtitle">Jump back into your feed, study groups, labs, and collaboration workspaces.</p>
        </div>
        <p className="auth-note">Need an account? <Link href="/sign-up">Create one</Link></p>
      </aside>

      <section className="auth-right-panel">
        <div className="stack" style={{ gap: "0.35rem" }}>
          <h2 className="section-title">Sign in</h2>
          <p className="muted">Access your science platform workspace.</p>
        </div>

        <div className="stack" style={{ gap: "0.55rem" }}>
          <SocialButton onClick={() => signInWith("oauth_google")} disabled={loading} label="Continue with Google" icon={<span className="auth-social-icon">G</span>} />
          <SocialButton onClick={() => signInWith("oauth_apple")} disabled={loading} label="Continue with Apple" icon={<span className="auth-social-icon"></span>} />
        </div>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="form">
          <input
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            placeholder="Email or username"
            autoComplete="username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Password"
            autoComplete="current-password"
            required
          />

          {error ? <p className="danger-text">{error}</p> : null}

          <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          <Link className="button secondary" href="/sign-up">Create account</Link>
        </form>
      </section>
    </div>
  );
}
