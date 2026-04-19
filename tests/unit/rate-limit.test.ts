import { describe, expect, it } from "vitest";
import { buildRateLimitKey } from "@/lib/rate-limit";

describe("buildRateLimitKey", () => {
  it("returns a stable hash for the same inputs", () => {
    const first = buildRateLimitKey({
      action: "post.create",
      userId: "user_123",
      ip: "127.0.0.1",
      route: "/feed"
    });

    const second = buildRateLimitKey({
      action: "post.create",
      userId: "user_123",
      ip: "127.0.0.1",
      route: "/feed"
    });

    expect(first).toBe(second);
  });

  it("changes when the action changes", () => {
    const first = buildRateLimitKey({
      action: "post.create",
      userId: "user_123",
      ip: "127.0.0.1",
      route: "/feed"
    });

    const second = buildRateLimitKey({
      action: "message.create",
      userId: "user_123",
      ip: "127.0.0.1",
      route: "/messages"
    });

    expect(first).not.toBe(second);
  });
});
