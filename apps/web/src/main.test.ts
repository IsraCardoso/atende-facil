import { describe, expect, it } from "vitest";

import { App } from "./main";

describe("App", () => {
  it("should render bootstrap text", () => {
    const element = App();

    expect(element.type).toBe("main");
    expect(element.props.children).toBe("web bootstrap ready");
  });
});
