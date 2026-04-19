
"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        }
      ) => void;
    };
  }
}

function loadTurnstileScript() {
  const existing = document.querySelector('script[data-turnstile="true"]');
  if (existing) return;

  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.dataset.turnstile = "true";
  document.head.appendChild(script);
}

export function TurnstileWidget({ name = "cf_turnstile_token" }: { name?: string }) {
  const id = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current || !inputRef.current) return;

    loadTurnstileScript();

    const interval = window.setInterval(() => {
      if (!window.turnstile || !containerRef.current || !inputRef.current) return;

      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback(token) {
          if (inputRef.current) inputRef.current.value = token;
        },
        "expired-callback"() {
          if (inputRef.current) inputRef.current.value = "";
        }
      });

      window.clearInterval(interval);
    }, 250);

    return () => window.clearInterval(interval);
  }, [siteKey]);

  if (!siteKey) {
    return <input type="hidden" name={name} value="" />;
  }

  return (
    <div className="stack">
      <div id={`turnstile-${id}`} ref={containerRef} />
      <input ref={inputRef} type="hidden" name={name} />
    </div>
  );
}
