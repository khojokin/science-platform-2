
import { AICopilotPanel } from "@/components/ai-copilot-panel";

export default function AIPage() {
  const prompts = [
    "Summarize this biology chapter into exam-ready bullet points",
    "Generate 15 flashcards for thermodynamics",
    "Create a quiz from this uploaded paper",
    "Build a 2-week revision plan for organic chemistry"
  ];

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">AI study copilot</h1>
        <p className="page-copy">
          Generate study plans, explanations, quizzes, summaries, revision cards, and research framing with your platform context.
        </p>
      </section>

      <AICopilotPanel />

      <section className="grid two">
        <article className="card stack">
          <h3>Prompt suggestions</h3>
          <div className="card-list">
            {prompts.map((prompt) => (
              <div key={prompt} className="row">
                <span className="inline-badge">AI</span>
                <span>{prompt}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h3>Premium AI outputs</h3>
          <div className="card-list">
            <div className="row"><span className="inline-badge">✓</span><span>One-click summaries and concept maps</span></div>
            <div className="row"><span className="inline-badge">✓</span><span>Adaptive quizzes and spaced-repetition cards</span></div>
            <div className="row"><span className="inline-badge">✓</span><span>Research framing and evidence extraction</span></div>
          </div>
        </article>
      </section>
    </div>
  );
}
