import { describe, expect, it } from "vitest";
import { HOME_DEFAULT, isDefaultLayout, moveSection, normalizeLayout, sameLayout, showSection, visibleIn } from "./homeLayout";

describe("normalizeLayout", () => {
  it("is the default with nothing stored, or with something that is not a layout", () => {
    expect(normalizeLayout(null)).toEqual(HOME_DEFAULT);
    expect(normalizeLayout(undefined)).toEqual(HOME_DEFAULT);
    expect(normalizeLayout("monitors")).toEqual(HOME_DEFAULT);
    expect(normalizeLayout({ order: "nope", hidden: 3 })).toEqual(HOME_DEFAULT);
  });

  it("drops unknown keys and puts back sections added since the save, in their default place", () => {
    const l = normalizeLayout({ order: ["energy", "journal", "nope", "activities"], hidden: ["coach", "nope", 7] });
    expect(l.order).toHaveLength(HOME_DEFAULT.order.length);
    expect(l.hidden).toEqual(["coach"]);
    // The saved My Day order survives; "day" and "tonight" come back next to their default neighbours.
    expect(visibleIn(l, "day")).toEqual(["day", "energy", "journal", "activities", "tonight"]);
  });

  it("keeps every section in its own area whatever the stored order", () => {
    const l = normalizeLayout({ order: ["week", ...HOME_DEFAULT.order.filter((k) => k !== "week")], hidden: [] });
    expect(visibleIn(l, "top")).toEqual(["heartRate", "monitors", "coach"]);
    expect(visibleIn(l, "side")).toEqual(["week", "dashboard", "strainRecovery"]);
  });

  it("drops a key listed twice", () => {
    const l = normalizeLayout({ order: ["coach", "coach", "monitors"], hidden: ["week", "week"] });
    expect(new Set(l.order).size).toBe(l.order.length);
    expect(l.hidden).toEqual(["week"]);
  });

  it("compares layouts ignoring the order of hidden keys", () => {
    expect(sameLayout({ ...HOME_DEFAULT, hidden: ["coach", "week"] }, { ...HOME_DEFAULT, hidden: ["week", "coach"] })).toBe(true);
    expect(isDefaultLayout(normalizeLayout({ order: [], hidden: [] }))).toBe(true);
  });
});

describe("moveSection and showSection", () => {
  it("moves only within the area and stops at its ends", () => {
    const down = moveSection(HOME_DEFAULT, "day", 1);
    expect(visibleIn(down, "day")).toEqual(["activities", "day", "tonight", "journal", "energy"]);
    expect(moveSection(HOME_DEFAULT, "day", -1)).toBe(HOME_DEFAULT);
    expect(moveSection(HOME_DEFAULT, "coach", 1)).toBe(HOME_DEFAULT);
    expect(visibleIn(moveSection(HOME_DEFAULT, "week", -1), "side")).toEqual(["dashboard", "week", "strainRecovery"]);
  });

  it("hides and shows a section once", () => {
    const hidden = showSection(showSection(HOME_DEFAULT, "energy", false), "energy", false);
    expect(hidden.hidden).toEqual(["energy"]);
    expect(visibleIn(hidden, "day")).not.toContain("energy");
    expect(showSection(hidden, "energy", true).hidden).toEqual([]);
  });
});
