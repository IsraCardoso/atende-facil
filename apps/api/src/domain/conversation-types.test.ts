import { describe, expect, it } from "vitest";

import { createConversationId, isValidTransition } from "./conversation-types";

describe("ConversationId", () => {
  it("should create valid ConversationId", () => {
    const id = createConversationId("abc-123");
    expect(id).toBe("abc-123");
  });

  it("should throw for empty value", () => {
    expect(() => createConversationId("")).toThrow("ConversationId invalido");
    expect(() => createConversationId("   ")).toThrow("ConversationId invalido");
  });
});

describe("isValidTransition", () => {
  it("should allow bot → waiting_human", () => {
    expect(isValidTransition("bot", "waiting_human")).toBe(true);
  });

  it("should allow waiting_human → human_active", () => {
    expect(isValidTransition("waiting_human", "human_active")).toBe(true);
  });

  it("should allow waiting_human → bot", () => {
    expect(isValidTransition("waiting_human", "bot")).toBe(true);
  });

  it("should allow human_active → bot", () => {
    expect(isValidTransition("human_active", "bot")).toBe(true);
  });

  it("should reject bot → human_active (skip waiting)", () => {
    expect(isValidTransition("bot", "human_active")).toBe(false);
  });

  it("should reject bot → bot (no-op)", () => {
    expect(isValidTransition("bot", "bot")).toBe(false);
  });

  it("should reject human_active → waiting_human (reverse)", () => {
    expect(isValidTransition("human_active", "waiting_human")).toBe(false);
  });

  it("should reject human_active → human_active (no-op)", () => {
    expect(isValidTransition("human_active", "human_active")).toBe(false);
  });
});
