import { describe, expect, it } from "vitest";

import { uiTokens } from "./index";

describe("uiTokens", () => {
  it("should expose baseline semantic colors", () => {
    expect(uiTokens.colorBackground).toBe("#ffffff");
    expect(uiTokens.colorText).toBe("#111827");
  });
});
