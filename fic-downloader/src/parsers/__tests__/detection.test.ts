import { describe, it, expect } from "vitest";
import { detectParser, isFicPage } from "../index.js";

describe("detectParser", () => {
  it("matches AO3 work URLs", () => {
    expect(detectParser("https://archiveofourown.org/works/12345")).not.toBeNull();
    expect(detectParser("https://archiveofourown.org/works/12345/chapters/67890")).not.toBeNull();
  });

  it("matches FFN story URLs", () => {
    expect(detectParser("https://www.fanfiction.net/s/12345/1/")).not.toBeNull();
    expect(detectParser("https://www.fanfiction.net/s/12345/1/Story-Title")).not.toBeNull();
  });

  it("returns null for unsupported URLs", () => {
    expect(detectParser("https://example.com")).toBeNull();
    expect(detectParser("https://archiveofourown.org/users/someone")).toBeNull();
    expect(detectParser("https://www.fanfiction.net/u/12345/")).toBeNull();
  });
});

describe("isFicPage", () => {
  it("returns true for supported fic URLs", () => {
    expect(isFicPage("https://archiveofourown.org/works/99999")).toBe(true);
    expect(isFicPage("https://www.fanfiction.net/s/99999/1/")).toBe(true);
  });

  it("returns false for non-fic URLs", () => {
    expect(isFicPage("https://google.com")).toBe(false);
  });
});
