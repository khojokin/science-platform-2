import { createConversationAction, sendMessageAction } from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { RealtimeConversationRefresher } from "@/components/realtime-conversation-refresher";
import { listUserConversations } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function MessagesPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const conversations = await listUserConversations(client, userId);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Messages</h1>
        <p className="page-copy">Direct messages now refresh in realtime when new rows land in Supabase Realtime.</p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Start a conversation</h3>
          <form className="form" action={createConversationAction}>
            <input name="recipient_handle" placeholder="Recipient handle" required />
            <textarea name="first_message" placeholder="Optional opening message" />
            <SubmitButton>Create conversation</SubmitButton>
          </form>
        </article>

        <article className="card">
          <h3>Messaging notes</h3>
          <div className="card-list">
            <div className="row"><span className="inline-badge">✓</span><span>Realtime refresh now listens for new message inserts.</span></div>
            <div className="row"><span className="inline-badge">✓</span><span>Notifications alert other members when a message is sent.</span></div>
            <div className="row"><span className="inline-badge">✓</span><span>Use a private file upload flow separately for attachments.</span></div>
          </div>
        </article>
      </section>

      <section className="card-list">
        {conversations.length === 0 ? (
          <div className="empty-state">No conversations yet. Start by entering a profile handle above.</div>
        ) : (
          conversations.map((conversation) => {
            const memberHandles = (conversation.members as Array<{ profile?: { handle?: string } }>)
              .map((member) => member.profile?.handle)
              .filter(Boolean)
              .join(", ");

            const recentMessages = conversation.messages as Array<{ id: string; body: string; created_at: string; sender?: { handle?: string } }>;

            return (
              <article key={String(conversation.id)} className="card stack">
                <RealtimeConversationRefresher conversationId={String(conversation.id)} />

                <div className="row">
                  <strong>{String(conversation.title || memberHandles || "Conversation")}</strong>
                  <span className="muted">{memberHandles}</span>
                </div>

                <div className="comment-list">
                  {recentMessages.length === 0 ? (
                    <div className="empty-state">No messages yet.</div>
                  ) : (
                    recentMessages.map((message) => (
                      <div key={message.id} className="comment-card stack">
                        <div className="row">
                          <span>@{String(message.sender?.handle ?? "member")}</span>
                          <span className="muted">{formatDate(String(message.created_at))}</span>
                        </div>
                        <div className="comment-body">{message.body}</div>
                      </div>
                    ))
                  )}
                </div>

                <form className="form" action={sendMessageAction}>
                  <input type="hidden" name="conversation_id" value={String(conversation.id)} />
                  <textarea name="body" placeholder="Send a message" required />
                  <SubmitButton>Send</SubmitButton>
                </form>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
