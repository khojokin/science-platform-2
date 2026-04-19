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

export function SignUpClient() {
  const brandTagline = "CREATE.INSPIRE.SHARE";
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectParam = String(searchParams?.get("redirect_url") || "").trim();
  const redirectTarget = useMemo(() => {
    if (!redirectParam) return "/feed";
    if (redirectParam.startsWith("/")) return redirectParam;
    return "/feed";
  }, [redirectParam]);

  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const normalizedUsername = username.trim().toLowerCase();
  const isUsernameValid = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/.test(normalizedUsername);

  const passwordRules = {
    minLength: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  };
  const isPasswordStrong = Object.values(passwordRules).every(Boolean);

  const ensureConsent = () => {
    if (acceptTerms && acceptPrivacy) return true;
    setError("You must agree to Terms and Privacy before creating an account.");
    return false;
  };

  const signUpWith = async (strategy: "oauth_google" | "oauth_apple") => {
    if (!ensureConsent()) return;
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("verify");
    }, strategy === "oauth_google" ? 450 : 550);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureConsent() || !isUsernameValid) return;

    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      setStep("verify");
    }, 500);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError("Enter the full 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}`);
    }, 450);
  };

  const strengthScore = Object.values(passwordRules).filter(Boolean).length;

  return (
    <div className="auth-shell-card">
      <aside className="auth-left-panel">
        <div>
          <p className="auth-brand">SciSphere</p>
          <p className="auth-tagline">{brandTagline}</p>
          <h1 className="auth-title">Build your science identity from day one.</h1>
          <p className="auth-subtitle">Create your profile, join communities, collaborate in groups, and grow with experts.</p>
        </div>
        <p className="auth-note">Already have an account? <Link href="/sign-in">Sign in</Link></p>
      </aside>

      <section className="auth-right-panel">
        {step === "form" ? (
          <>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <h2 className="section-title">Create account</h2>
              <p className="muted">Start your science collaboration journey.</p>
            </div>

            <div className="stack" style={{ gap: "0.55rem" }}>
              <SocialButton
                onClick={() => signUpWith("oauth_google")}
                disabled={loading}
                label="Continue with Google"
                icon={<span className="auth-social-icon">G</span>}
              />
              <SocialButton
                onClick={() => signUpWith("oauth_apple")}
                disabled={loading}
                label="Continue with Apple"
                icon={<span className="auth-social-icon"></span>}
              />
            </div>

            <div className="auth-divider"><span>or</span></div>

            <form onSubmit={handleSignUp} className="form">
              <div className="grid two">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" required />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" required />
              </div>

              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s+/g, "").toLowerCase());
                  setError("");
                }}
                placeholder="Username"
                autoComplete="username"
                minLength={3}
                maxLength={32}
                required
              />
              <p className={`auth-helper ${username.length === 0 || isUsernameValid ? "muted" : "danger-text"}`}>
                Use 3-32 chars: letters, numbers, dot, underscore, hyphen.
              </p>

              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" minLength={12} required />

              <div className="strength-track"><div className="strength-fill" style={{ width: `${(strengthScore / 5) * 100}%` }} /></div>

              <label className="auth-check"><input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} /> I agree to <Link href="/terms">Terms</Link></label>
              <label className="auth-check"><input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} /> I agree to <Link href="/privacy">Privacy Policy</Link></label>

              {error ? <p className="danger-text">{error}</p> : null}

              <button type="submit" disabled={loading || !acceptTerms || !acceptPrivacy || !isPasswordStrong || !isUsernameValid}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerify} className="form">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <h2 className="section-title">Verify your email</h2>
              <p className="muted">Enter the 6-digit code sent to {email}.</p>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              required
            />
            {error ? <p className="danger-text">{error}</p> : null}
            <button type="submit" disabled={loading || code.length < 6}>{loading ? "Verifying…" : "Verify email"}</button>
            <button type="button" className="button secondary" onClick={() => setStep("form")}>Back</button>
          </form>
        )}
      </section>
    </div>
  );
}
