import { describe, expect, it } from "vitest";

import { createMetaAdapter, resolveMetaChallenge } from "./meta-adapter";

describe("MetaAdapter", () => {
  const adapter = createMetaAdapter();

  describe("normalizer", () => {
    it("should normalize a valid Meta Cloud API payload", () => {
      const rawPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "123456",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  messages: [
                    {
                      id: "wamid.123",
                      from: "5511999999999",
                      timestamp: "1700000000",
                      text: { body: "Olá do Meta" },
                      type: "text",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = adapter.normalizer.normalize(rawPayload);

      expect(result).not.toBeNull();
      expect(result?.messageId).toBe("wamid.123");
      expect(result?.from).toBe("5511999999999");
      expect(result?.text).toBe("Olá do Meta");
      expect(result?.provider).toBe("meta");
    });

    it("should return null for empty payload", () => {
      expect(adapter.normalizer.normalize(null)).toBeNull();
      expect(adapter.normalizer.normalize({})).toBeNull();
      expect(adapter.normalizer.normalize({ entry: [] })).toBeNull();
    });
  });

  describe("verifier", () => {
    it("should validate correct bearer token", () => {
      const result = adapter.verifier.verify({
        headers: { authorization: "Bearer test-token" },
        query: {},
        body: {},
        instanceConfig: {
          provider: "meta",
          config: {
            phoneNumberId: "123",
            accessToken: "test-token",
            verifyToken: "verify-me",
            apiVersion: "v18.0",
          },
        },
      });

      expect(result.valid).toBe(true);
    });

    it("should reject invalid token", () => {
      const result = adapter.verifier.verify({
        headers: { authorization: "Bearer wrong-token" },
        query: {},
        body: {},
        instanceConfig: {
          provider: "meta",
          config: {
            phoneNumberId: "123",
            accessToken: "correct-token",
            verifyToken: "verify-me",
            apiVersion: "v18.0",
          },
        },
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("resolveMetaChallenge", () => {
    it("should return challenge when mode is subscribe and token matches", () => {
      const result = resolveMetaChallenge({
        mode: "subscribe",
        verifyToken: "my-verify-token",
        challenge: "challenge-12345",
        expectedVerifyToken: "my-verify-token",
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.challenge).toBe("challenge-12345");
      }
    });

    it("should reject when mode is not subscribe", () => {
      const result = resolveMetaChallenge({
        mode: "unsubscribe",
        verifyToken: "my-verify-token",
        challenge: "challenge-12345",
        expectedVerifyToken: "my-verify-token",
      });

      expect(result.valid).toBe(false);
    });

    it("should reject when token does not match", () => {
      const result = resolveMetaChallenge({
        mode: "subscribe",
        verifyToken: "wrong-token",
        challenge: "challenge-12345",
        expectedVerifyToken: "my-verify-token",
      });

      expect(result.valid).toBe(false);
    });
  });
});
