import { describe, expect, it } from "vitest";
import { renderTransactionalEmail } from "@/lib/email";

describe("renderTransactionalEmail", () => {
  it("renders welcome content", () => {
    const result = renderTransactionalEmail({
      template: "welcome",
      recipientName: "Ada"
    });

    expect(result.subject).toContain("Welcome");
    expect(result.html).toContain("Ada");
  });
});
