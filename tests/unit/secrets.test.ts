import { describe, expect, it } from "vitest";
import { fingerprintSecret } from "@/lib/secrets";

describe("fingerprintSecret", () => {
  it("returns stable shortened hashes", () => {
    expect(fingerprintSecret("alpha")).toHaveLength(16);
    expect(fingerprintSecret("alpha")).toBe(fingerprintSecret("alpha"));
    expect(fingerprintSecret("alpha")).not.toBe(fingerprintSecret("beta"));
  });
});
