import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The app sets type on one ten-step scale (tailwind.config.js `fontSize`, docs/design/linear-mobile.md). A size class
// outside it (text-[15px], Tailwind's text-sm) silently grows the scale again, so none may appear in the source.
const ROOTS = ["src", "app"];
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "locales" ? [] : files(p);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [p] : [];
  });

const OFF_SCALE = /(?<![\w\-[])text-(?:\[\d+(?:\.\d+)?px\]|xs|sm|base|lg|xl|[2-9]xl)(?![\w\-\]/])/g;
const OFF_GRID = /(?<![\w\-[])-?(?:p[xytblrse]?|m[xytblr]?|gap(?:-[xy])?|space-[xy])-(?:2\.5|3\.5)(?![\w\-.\]/])/g;

describe("type scale", () => {
  const sources = ROOTS.flatMap(files).map((f) => [f, readFileSync(f, "utf8")] as const);
  it("uses only the scale's sizes", () => {
    const found = sources.flatMap(([f, s]) => (s.match(OFF_SCALE) ?? []).map((m) => `${f}: ${m}`));
    expect(found).toEqual([]);
  });
  it("keeps padding, margins and gaps on the 4 px grid (2 and 6 px still allowed for hairline offsets)", () => {
    const found = sources.flatMap(([f, s]) => (s.match(OFF_GRID) ?? []).map((m) => `${f}: ${m}`));
    expect(found).toEqual([]);
  });
});

describe("cn and the scale", () => {
  it("knows every step of tailwind.config.js as a size, not a colour", async () => {
    const { TYPE_STEPS, cn } = await import("./cn");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("../../tailwind.config.js") as { theme: { fontSize: Record<string, unknown> } };
    expect([...TYPE_STEPS].sort()).toEqual(Object.keys(config.theme.fontSize).sort());
    for (const step of TYPE_STEPS) expect(cn(`text-${step}`, "text-foreground")).toBe(`text-${step} text-foreground`);
  });
});
