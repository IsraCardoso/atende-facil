import { describe, expect, it } from "vitest";

import type { ChatwootConversationId } from "../../domain/whatsapp-types";
import { createChatwootAccessService } from "./chatwoot-access-service";

function asChatwootId(value: string): ChatwootConversationId {
  return value as ChatwootConversationId;
}

describe("ChatwootAccessService", () => {
  it("should generate conversation URLs when app URL is configured", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com",
      chatwootAccountId: "1",
    });

    const urls = service.generateAccessUrls(asChatwootId("42"));

    expect(urls.deepLink).toBe("https://chatwoot.example.com/app/accounts/1/conversations/42");
    expect(urls.embedUrl).toBe("https://chatwoot.example.com/app/accounts/1/conversations/42");
  });

  it("should return null URLs when app URL is not configured", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: null,
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
      chatwootAccountId: "2",
    });

    const urls = service.generateAccessUrls(asChatwootId("10"));

    expect(urls.deepLink).toBe("https://chatwoot.example.com/app/accounts/2/conversations/10");
  });

  it("should expose relative conversation path for use as SSO redirect target", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com",
      chatwootAccountId: "7",
    });

    expect(service.conversationPath(asChatwootId("99"))).toBe("/app/accounts/7/conversations/99");
    expect(service.dashboardPath).toBe("/app/accounts/7/dashboard");
  });

  it("should generate portal URL for account dashboard", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: "https://chatwoot.example.com",
      chatwootAccountId: "3",
    });

    expect(service.generatePortalUrl().portalUrl).toBe(
      "https://chatwoot.example.com/app/accounts/3/dashboard",
    );
  });

  it("should return null portal URL when app URL is not configured", () => {
    const service = createChatwootAccessService({
      chatwootAppUrl: null,
      chatwootAccountId: "1",
    });

    expect(service.generatePortalUrl().portalUrl).toBeNull();
  });
});
