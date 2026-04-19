import { describe, expect, it } from "vitest";
import { normalizeHandle, parseCommaList, slugify, truthy, truncate } from "@/lib/utils";

describe("utils", () => {
  it("slugify creates URL-safe slugs", () => {
    expect(slugify("Environmental Science 101")).toBe("environmental-science-101");
  });

  it("normalizeHandle removes invalid characters", () => {
    expect(normalizeHandle("Alice Lab!!")).toBe("alicelab");
    expect(normalizeHandle("bio_fan-01")).toBe("bio_fan-01");
  });

  it("parseCommaList trims and drops empty values", () => {
    expect(parseCommaList("Physics, Biology,  , Chemistry" as never)).toEqual(["Physics", "Biology", "Chemistry"]);
  });

  it("truthy handles checkbox-style values", () => {
    expect(truthy("true")).toBe(true);
    expect(truthy("on")).toBe(true);
    expect(truthy("false")).toBe(false);
  });

  it("truncate shortens long text with ellipsis", () => {
    expect(truncate("abcdefghij", 6)).toBe("abcde…");
  });
});
