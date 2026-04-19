
import { AICopilotPanel } from "@/components/ai-copilot-panel";

export default function AIPage() {
  return (
    <div className="stack">
      <section>
        <h1 className="page-title">AI study copilot</h1>
        <p className="page-copy">
          Generate study plans, explanations, quizzes, summaries, revision cards, and research framing with your platform context.
        </p>
      </section>

      <AICopilotPanel />
    </div>
  );
}
