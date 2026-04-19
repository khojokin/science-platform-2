import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";
import { topicNavItems, topicNavMap } from "@/lib/topic-nav";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return topicNavItems.map((item) => ({ slug: item.slug }));
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = topicNavMap.get(slug);

  if (!topic) {
    notFound();
  }

  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader badge={topic.badge} title={topic.title} copy={topic.copy} />

        <section className="grid two">
          <article className="card stack">
            <h3>What you can do here</h3>
            <ul className="clean-list">
              {topic.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>

          <article className="showcase-card stack">
            <h3>{topic.label}</h3>
            <p className="muted">
              This category hub is part of the updated main navigation and gives visitors a focused entry point into the
              broader platform experience.
            </p>
            <div className="actions">
              {topic.featuredLinks.map((link) => (
                <Link key={link.href} className="button secondary" href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        </section>
      </main>
    </MarketingShell>
  );
}