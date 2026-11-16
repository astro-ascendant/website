import { describe, expect, test } from "bun:test";
import installed from "astro-ascendant/package.json" with { type: "json" };
import { libraryVersion } from "./shared";

describe("libraryVersion", () => {
  test("matches the installed astro-ascendant release (major.minor)", () => {
    const [major, minor] = installed.version.split(".");
    expect(libraryVersion).toBe(`${major}.${minor}`);
  });
});
