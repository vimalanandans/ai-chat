import { describe, expect, it } from "vitest";
import { parseModels } from "./runtime";

describe("model configuration", () => {
  it("uses each configured model and removes empty entries", () => {
    expect(parseModels("alpha, , beta", undefined).map((model) => model.id)).toEqual(["alpha", "beta"]);
  });

  it("provides a safe default model identifier", () => {
    expect(parseModels(undefined, undefined)[0].id).toBe("gpt-4.1-mini");
  });
});
