import { describe, expect, it } from "vitest";
import {
  toggleActiveSchema,
  togglePublishedSchema,
  toggleRoundStatusSchema,
} from "../validators/admin.validator";

// Regression test for a real bug: the old handlers used Boolean(req.body?.x),
// and Boolean("false") is true (any non-empty string is truthy) — a client
// sending the string "false" would silently flip the opposite way.
describe("toggleActiveSchema", () => {
  it("accepts real booleans", () => {
    expect(toggleActiveSchema.safeParse({ isActive: true }).success).toBe(true);
    expect(toggleActiveSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("rejects the string 'false' instead of silently coercing it to true", () => {
    const result = toggleActiveSchema.safeParse({ isActive: "false" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    expect(toggleActiveSchema.safeParse({}).success).toBe(false);
  });
});

describe("togglePublishedSchema", () => {
  it("rejects non-boolean input the same way", () => {
    expect(togglePublishedSchema.safeParse({ isPublished: "false" }).success).toBe(false);
    expect(togglePublishedSchema.safeParse({ isPublished: true }).success).toBe(true);
  });
});

describe("toggleRoundStatusSchema", () => {
  it("accepts only known round statuses", () => {
    expect(toggleRoundStatusSchema.safeParse({ status: "ACTIVE" }).success).toBe(true);
    expect(toggleRoundStatusSchema.safeParse({ status: "NOT_A_STATUS" }).success).toBe(false);
    expect(toggleRoundStatusSchema.safeParse({}).success).toBe(false);
  });
});
