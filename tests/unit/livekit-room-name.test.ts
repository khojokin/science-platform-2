import { describe, expect, it } from "vitest";
import { getCallRoomLivekitName } from "@/lib/livekit";

describe("getCallRoomLivekitName", () => {
  it("prefers the room slug when available", () => {
    expect(getCallRoomLivekitName({ id: "123", slug: "quantum-lab" })).toBe("science-quantum-lab");
  });

  it("falls back to room id", () => {
    expect(getCallRoomLivekitName({ id: "123" })).toBe("science-123");
  });
});
