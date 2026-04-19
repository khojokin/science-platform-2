
import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils";

describe("advanced scaffold smoke", () => {
  it("slugifies workspace names", () => {
    expect(slugify("Imperial Biophysics Society")).toBe("imperial-biophysics-society");
  });
});
