import { describe, expect, test } from "bun:test";
import { readOwnerId } from "./owner";

describe("readOwnerId", () => {
  test("accepts a UUID and normalises its case", () => {
    expect(readOwnerId(" 0A1B2C3D-0000-4000-8000-000000000001 ")).toBe(
      "0a1b2c3d-0000-4000-8000-000000000001",
    );
  });

  test("refuses anything else", () => {
    expect(readOwnerId(undefined)).toBeNull();
    expect(readOwnerId("")).toBeNull();
    expect(readOwnerId("' or 1=1 --")).toBeNull();
  });
});
