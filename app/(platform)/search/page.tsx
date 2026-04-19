
import { auth } from "@clerk/nextjs/server";
import { syncSearchIndexAction } from "@/lib/advanced-actions";
import { searchKnowledge } from "@/lib/advanced-queries";
import { SubmitButton } from "@/components/submit-button";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { userId } = await auth();
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const results = q ? await searchKnowledge(q, userId) : [];

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Semantic science search</h1>
        <p className="page-copy">
          Search posts, notes, resources, events, bounties, transcripts, and workspace knowledge by meaning, not just keywords.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <form className="form" action="/search" method="GET">
            <input name="q" defaultValue={q} placeholder="Search by concept, topic, or question..." />
            <button type="submit">Search</button>
          </form>
        </article>

        <article className="card">
          <h3>Reindex your content</h3>
          <p className="muted">Refresh embeddings and keyword index rows for your posts, notes, resources, bounties, and events.</p>
          <form action={syncSearchIndexAction}>
            <SubmitButton>Rebuild my index</SubmitButton>
          </form>
        </article>
      </section>

      <section className="card-list">
        {q && results.length === 0 ? (
          <div className="empty-state">No results for “{q}” yet. Try a broader concept or reindex your content.</div>
        ) : (
          results.map((result) => (
            <article key={`${result.source_type}-${result.source_id}`} className="card stack">
              <div className="row">
                <h3 style={{ margin: 0 }}>{String(result.title ?? "Untitled")}</h3>
                <span className="inline-badge">{String(result.source_type ?? "doc")}</span>
              </div>
              <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{String(result.body ?? "").slice(0, 420)}</p>
              <div className="row">
                <span className="muted">Visibility: {String(result.visibility ?? "public")}</span>
                <a className="button secondary" href={String(result.url ?? "#")}>
                  Open
                </a>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
