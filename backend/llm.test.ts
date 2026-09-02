import { describe, expect, it } from "vitest";
import { CURRENT_GEMINI_MODEL, resolveGeminiModel } from "./_core/llm";

describe("Gemini model compatibility", () => {
  it("uses the current stable multimodal model by default", () => {
    expect(CURRENT_GEMINI_MODEL).toBe("gemini-3.7-flash");
    expect(resolveGeminiModel()).toBe("gemini-3.7-flash");
  });

  it("falls back when an obsolete 1.5 model is configured", () => {
    expect(resolveGeminiModel("gemini-1.5-flash")).toBe(CURRENT_GEMINI_MODEL);
    expect(resolveGeminiModel("gemini-1.5-flash-001")).toBe(CURRENT_GEMINI_MODEL);
  });

  it("preserves a supported explicit model override", () => {
    expect(resolveGeminiModel("gemini-2.5-flash")).toBe("gemini-2.5-flash");
    expect(resolveGeminiModel(" gemini-3.7-flash ")).toBe("gemini-3.7-flash");
  });
});
