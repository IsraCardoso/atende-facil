import { describe, expect, it } from "vitest";

import type { ChatwootConversationId } from "../../domain/whatsapp-types";
import { createChatwootAccessService } from "./chatwoot-access-service";

function asChatwootId(value: string): ChatwootConversationId {
  return value as ChatwootConversationId;
}

describe("ChatwootAccessService", () => {
  it("should generate embed URL and deep-link when SSO secret is provided", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com",
      chatwootSsoSecret: "test-secret",
      chatwootAccountId: "1",
    });

    const urls = service.generateAccessUrls(asChatwootId("42"));

    expect(urls.deepLink).toBe("https://chatwoot.example.com/app/accounts/1/conversations/42");
    expect(urls.embedUrl).toContain(
      "https://chatwoot.example.com/app/accounts/1/conversations/42?sso_token=",
    );
    expect(service.isEmbedAvailable).toBe(true);
  });

  it("should return null embed URL when SSO secret is not configured", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com",
      chatwootSsoSecret: null,
      chatwootAccountId: "1",
    });

    const urls = service.generateAccessUrls(asChatwootId("42"));

    expect(urls.embedUrl).toBeNull();
    expect(urls.deepLink).toBe("https://chatwoot.example.com/app/accounts/1/conversations/42");
    expect(service.isEmbedAvailable).toBe(false);
  });

  it("should return null URLs when app URL is not configured", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: null,
      chatwootSsoSecret: "test-secret",
      chatwootAccountId: "1",
    });

    const urls = service.generateAccessUrls(asChatwootId("42"));

    expect(urls.embedUrl).toBeNull();
    expect(urls.deepLink).toBeNull();
    expect(service.isAppConfigured).toBe(false);
  });

  it("should strip trailing slash from app URL", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com/",
      chatwootSsoSecret: null,
      chatwootAccountId: "2",
    });

    const urls = service.generateAccessUrls(asChatwootId("10"));

    expect(urls.deepLink).toBe("https://chatwoot.example.com/app/accounts/2/conversations/10");
  });

  it("should generate different tokens for different conversation IDs", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com",
      chatwootSsoSecret: "test-secret",
      chatwootAccountId: "1",
    });

    const urls1 = service.generateAccessUrls(asChatwootId("1"));
    const urls2 = service.generateAccessUrls(asChatwootId("2"));

    expect(urls1.embedUrl).not.toBe(urls2.embedUrl);
  });
});
