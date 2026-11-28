import { describe, expect, it } from "vitest";
import { FACES, hasColorClass, readFont } from "./fontClasses";

const base = { family: "sans", weight: "regular" } as const;

describe("readFont", () => {
  it("takes the family and weight off the classes and leaves the rest", () => {
    const r = readFont("font-numeric text-value font-bold leading-6", base);
    expect(r.face).toEqual({ family: "numeric", weight: "bold" });
    expect(r.rest).toBe("text-value leading-6");
    expect(FACES[r.face.family][r.face.weight]).toBe("Inter_600SemiBold");
  });
  it("inherits what it does not name", () => {
    expect(readFont("text-meta font-semibold", { family: "numeric", weight: "bold" }).face).toEqual({ family: "numeric", weight: "semibold" });
    expect(readFont("text-caption", { family: "numeric", weight: "bold" }).face).toEqual({ family: "numeric", weight: "bold" });
  });
  it("reads truncate and line-clamp as a line count", () => {
    expect(readFont("truncate text-meta", base).lines).toBe(1);
    expect(readFont("line-clamp-2", base).lines).toBe(2);
    expect(readFont("text-meta", base).lines).toBeUndefined();
  });
  it("shrinks like a CSS flex item unless the classes say otherwise", () => {
    expect(readFont("text-meta", base).shrink).toBe(1);
    expect(readFont("text-meta whitespace-nowrap", base)).toMatchObject({ shrink: 0, rest: "text-meta" });
    for (const c of ["shrink-0", "shrink", "flex-1", "min-w-0 flex-1", "flex-none"]) expect(readFont(c, base).shrink).toBeUndefined();
  });
  it("numerals never go below Inter's medium face, and bold figures are semibold, as Linear sets them", () => {
    expect(FACES.numeric.regular).toBe("Inter_500Medium");
    expect(FACES.numeric.bold).toBe("Inter_600SemiBold");
  });
});

describe("hasColorClass", () => {
  it("tells colour classes from size classes", () => {
    for (const c of ["text-muted-foreground", "text-foreground/85", "text-optimal-text", "dark:text-on-media", "text-[#fff]", "text-foreground/[0.045]"]) expect(hasColorClass(c)).toBe(true);
    for (const c of ["text-caption", "text-body", "text-center", "text-balance", "font-bold", "text-title"]) expect(hasColorClass(c)).toBe(false);
  });
  it("finds one among many", () => {
    expect(hasColorClass("text-caption font-bold text-recovery-red-text uppercase")).toBe(true);
  });
});
