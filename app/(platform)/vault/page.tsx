
import { createVaultItemAction } from "@/lib/advanced-actions";
import { listVaultItems } from "@/lib/advanced-queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";

export default async function VaultPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const items = await listVaultItems(client, userId);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Resource vault</h1>
        <p className="page-copy">Curate premium notes, guides, exam packs, research digests, and reusable resources.</p>
      </section>

      <section className="card">
        <h3>Add a vault resource</h3>
        <form className="form" action={createVaultItemAction}>
          <input name="title" placeholder="A-level electrochemistry revision pack" required />
          <textarea name="description" placeholder="What is inside and who is it for?" required />
          <textarea name="content_markdown" placeholder="Paste the notes, summary, or resource content here." />
          <input name="source_url" placeholder="Optional external URL" />
          <input name="tags" placeholder="exam prep, chemistry, electrochemistry" />
          <select name="visibility" defaultValue="public">
            <option value="public">Public</option>
            <option value="premium">Premium members only</option>
            <option value="private">Private</option>
          </select>
          <select name="premium_only" defaultValue="false">
            <option value="false">Available in standard plan rules</option>
            <option value="true">Explicit premium-only highlight</option>
          </select>
          <TurnstileWidget />
          <SubmitButton>Save resource</SubmitButton>
        </form>
      </section>

      <section className="card-list">
        {items.map((item) => (
          <article key={item.id} className="card stack">
            <div className="row">
              <h3 style={{ margin: 0 }}>{item.title}</h3>
              <span className="inline-badge">{item.visibility}</span>
            </div>
            <p className="muted">{item.description}</p>
            <div className="row wrap">
              {(item.tags ?? []).map((tag: string) => (
                <span key={tag} className="inline-badge">
                  #{tag}
                </span>
              ))}
            </div>
            {item.source_url ? (
              <a className="button secondary" href={item.source_url}>
                Open source
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
