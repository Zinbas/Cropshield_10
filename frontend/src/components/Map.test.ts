import { describe, expect, it } from "vitest";
import { toMapCenter } from "@/lib/mapUtils";

describe("map coordinate handling", () => {
  it("preserves valid saved farm coordinates", () => {
    expect(toMapCenter("19.9975", "73.7898")).toEqual({ lat: 19.9975, lng: 73.7898 });
  });

  it("falls back to the India overview for missing or impossible coordinates", () => {
    expect(toMapCenter()).toEqual({ lat: 20.5937, lng: 78.9629 });
    expect(toMapCenter(95, 73)).toEqual({ lat: 20.5937, lng: 78.9629 });
    expect(toMapCenter(19, -181)).toEqual({ lat: 20.5937, lng: 78.9629 });
  });
});
