import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

export default function ContactPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Contact"
          title="Reach the Science Platform team"
          copy="Support, partnerships, educator onboarding, and institution inquiries."
        />

        <section className="grid two">
          <article className="card stack">
            <h3>Contact form</h3>
            <form className="form">
              <input placeholder="Full name" />
              <input type="email" placeholder="Email" />
              <select defaultValue="support">
                <option value="support">Support</option>
                <option value="partnership">Partnership</option>
                <option value="educator">Educator / Institution</option>
              </select>
              <textarea placeholder="How can we help?" />
              <button type="button">Send message</button>
            </form>
          </article>

          <article className="card stack">
            <h3>Direct channels</h3>
            <p><strong>Support:</strong> support@scienceplatform.app</p>
            <p><strong>Business:</strong> partnerships@scienceplatform.app</p>
            <p><strong>Educators:</strong> educators@scienceplatform.app</p>
            <p className="muted">Typical response time: within 1 business day for support and 2 business days for partnerships.</p>
          </article>
        </section>
      </main>
    </MarketingShell>
  );
}
