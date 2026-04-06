import { describe, expect, it } from "vitest";

import { createEvolutionAdapter } from "./evolution-adapter";

describe("EvolutionAdapter", () => {
  const adapter = createEvolutionAdapter();

  describe("normalizer", () => {
    it("should normalize a valid Evolution payload", () => {
      const rawPayload = {
        data: {
          key: {
            remoteJid: "5511999999999@s.whatsapp.net",
            id: "msg-001",
          },
          message: {
            conversation: "Olá, tudo bem?",
          },
          messageTimestamp: 1700000000,
        },
      };

      const result = adapter.normalizer.normalize(rawPayload);

      expect(result).not.toBeNull();
      expect(result?.messageId).toBe("msg-001");
      expect(result?.from).toBe("5511999999999");
      expect(result?.text).toBe("Olá, tudo bem?");
      expect(result?.provider).toBe("evolution");
      expect(result?.timestamp).toBe(1700000000);
    });

    it("should normalize extendedTextMessage", () => {
      const rawPayload = {
        data: {
          key: {
            remoteJid: "5511888888888@s.whatsapp.net",
            id: "msg-002",
          },
          message: {
            extendedTextMessage: {
              text: "Mensagem extendida",
            },
          },
          messageTimestamp: "1700000001",
        },
      };

      const result = adapter.normalizer.normalize(rawPayload);

      expect(result).not.toBeNull();
      expect(result?.text).toBe("Mensagem extendida");
      expect(result?.timestamp).toBe(1700000001);
    });

    it("should return null when payload is invalid", () => {
      expect(adapter.normalizer.normalize(null)).toBeNull();
      expect(adapter.normalizer.normalize({})).toBeNull();
      expect(adapter.normalizer.normalize({ data: {} })).toBeNull();
      expect(adapter.normalizer.normalize({ data: { key: {}, message: {} } })).toBeNull();
    });
  });

  describe("verifier", () => {
    it("should validate matching apikey header", () => {
      const result = adapter.verifier.verify({
        headers: { apikey: "my-secret-key" },
        query: {},
        body: {},
        instanceConfig: {
          provider: "evolution",
          config: {
            instanceName: "test",
            apiUrl: "http://localhost",
            apiKey: "my-secret-key",
          },
        },
      });

      expect(result.valid).toBe(true);
    });

    it("should reject wrong apikey", () => {
      const result = adapter.verifier.verify({
        headers: { apikey: "wrong-key" },
        query: {},
        body: {},
        instanceConfig: {
          provider: "evolution",
          config: {
            instanceName: "test",
            apiUrl: "http://localhost",
            apiKey: "correct-key",
          },
        },
      });

      expect(result.valid).toBe(false);
    });

    it("should reject missing apikey", () => {
      const result = adapter.verifier.verify({
        headers: {},
        query: {},
        body: {},
        instanceConfig: {
          provider: "evolution",
          config: {
            instanceName: "test",
            apiUrl: "http://localhost",
            apiKey: "my-key",
          },
        },
      });

      expect(result.valid).toBe(false);
    });
  });
});
