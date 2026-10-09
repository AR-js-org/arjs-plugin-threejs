import { describe, it, expect } from "vitest";
import { toMatrix16, markerKey, normalizeMarker } from "../src/marker.js";

const sixteen = () => Array.from({ length: 16 }, (_, i) => i);

describe("toMatrix16", () => {
  it("accepts Array, Float32Array and Float64Array of 16 and rejects other lengths and non-arrays", () => {
    const array = sixteen();
    const f32 = new Float32Array(16);
    const f64 = new Float64Array(16);
    expect(toMatrix16(array)).toBe(array);
    expect(toMatrix16(f32)).toBe(f32);
    expect(toMatrix16(f64)).toBe(f64);

    expect(toMatrix16(new Float32Array(9))).toBeNull();
    expect(toMatrix16([1, 2, 3])).toBeNull();
    expect(toMatrix16({ length: 16 })).toBeNull();
    expect(toMatrix16(null)).toBeNull();
    expect(toMatrix16(undefined)).toBeNull();
  });
});

describe("markerKey", () => {
  it("keeps pattern 0 and barcode 0 apart", () => {
    expect(markerKey(0, "pattern")).not.toBe(markerKey(0, "barcode"));
    expect(markerKey(3)).toBe("pattern:3");
    expect(markerKey("3", "barcode")).toBe("barcode:3");
  });
});

describe("normalizeMarker", () => {
  it("reads the 0.3.0 payload", () => {
    const matrix = new Float32Array(16);
    const vertex = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const marker = normalizeMarker(
      {
        markerId: 0,
        type: "barcode",
        matrix,
        confidence: 0.8,
        vertex,
        dir: 2,
      },
      true,
    );

    expect(marker).toEqual({
      key: "barcode:0",
      markerId: "0",
      type: "barcode",
      matrix,
      visible: true,
      confidence: 0.8,
      vertex,
      dir: 2,
    });
  });

  it("falls back to legacy names", () => {
    const marker = normalizeMarker(
      { id: 5, transformationMatrix: sixteen() },
      true,
    );

    expect(marker.key).toBe("pattern:5");
    expect(marker.markerId).toBe("5");
    expect(marker.type).toBe("pattern");
    expect(marker.matrix).toHaveLength(16);
  });

  it("returns null without an id", () => {
    expect(normalizeMarker({ matrix: sixteen() }, true)).toBeNull();
    expect(normalizeMarker(null, false)).toBeNull();
  });
});
