import { requireUserId } from "@/lib/auth";
import { getUserDashboard } from "@/lib/analytics";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const dashboard = await getUserDashboard(userId);
  const maxDaily = Math.max(
    1,
    ...dashboard.analytics.map((item: any) => Number(item.signups_count ?? 0) + Number(item.posts_count ?? 0) + Number(item.messages_count ?? 0))
  );

  return (
    <div className="stack">
      <section className="header-row">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-copy">Track your activity, product momentum, and what parts of the platform need attention next.</p>
        </div>
      </section>

      <section className="grid four">
        {dashboard.metrics.map((metric) => (
          <article key={metric.label} className="metric">
            <span className="muted">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Activity trend</h3>
          <div className="chart-list">
            {dashboard.analytics.length === 0 ? (
              <div className="empty-state">No analytics rollups yet. Queue the analytics job from Ops.</div>
            ) : (
              dashboard.analytics.map((item: any) => {
                const value = Number(item.signups_count ?? 0) + Number(item.posts_count ?? 0) + Number(item.messages_count ?? 0);
                const width = `${Math.max((value / maxDaily) * 100, 8)}%`;

                return (
                  <div key={String(item.day)} className="chart-row">
                    <span className="chart-label">{String(item.day)}</span>
                    <div className="chart-track">
                      <div className="chart-bar" style={{ width }} />
                    </div>
                    <strong>{value}</strong>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="card stack">
          <h3>What to improve next</h3>
          <ul className="clean-list">
            <li>Turn on the daily analytics rollup job so the charts stay fresh.</li>
            <li>Promote your best communities into institution workspaces for stronger retention.</li>
            <li>Use bounties, events, and expert verification to create premium reasons to come back.</li>
            <li>Review unread alerts and moderation signals daily during early growth.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
