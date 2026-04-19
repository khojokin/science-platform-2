
"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AICopilotPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setPrompt("");

    try {
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed })
      });

      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: String(data.answer ?? "No response.") }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "Request failed." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card stack">
      <div>
        <h3>AI study copilot</h3>
        <p className="muted">
          Ask for a summary, quiz, revision plan, research framing, or a clearer explanation of a difficult concept.
        </p>
      </div>

      <div className="card-list">
        {messages.length === 0 ? (
          <div className="empty-state">Try: “Make me a 30-minute revision plan for organic chemistry reaction mechanisms.”</div>
        ) : (
          messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className="card stack">
              <span className={`inline-badge ${message.role === "assistant" ? "success" : ""}`}>{message.role}</span>
              <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
            </article>
          ))
        )}
      </div>

      <div className="form">
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask your next study question..." />
        <button type="button" onClick={submit} disabled={loading}>
          {loading ? "Thinking..." : "Ask copilot"}
        </button>
      </div>
    </section>
  );
}
