import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Prose.tsx imports React Native; the splitter is pure, so the test loads it through a light mock of the kit.
vi.mock("./Text", () => ({ Text: () => null }));
vi.mock("./Press", () => ({ Press: () => null }));
vi.mock("./haptics", () => ({ haptic: {} }));
vi.mock("react-native-reanimated", () => ({ default: { View: () => null }, FadeIn: {}, LinearTransition: {}, useReducedMotion: () => false, Easing: { bezier: () => () => 0 } }));
vi.mock("react-native", () => ({ View: () => null }));
vi.mock("@/i18n/config", () => ({ i18n: { t: (k: string) => k } }));
const { splitLede, FOLD_MIN } = await import("./Prose");

const long = (lede: string, rest = "The rest explains how it is worked out, in detail, over several clauses that run on.") => `${lede} ${rest}`;

describe("splitLede", () => {
  it("leaves short text whole", () => {
    expect(splitLede("One idea. Another idea.")).toEqual(["One idea. Another idea.", null]);
  });
  it("leads a long paragraph with its first sentence", () => {
    const text = long("Recovery is how ready your body is to take on strain today.", "It folds four signals into one number between 0 and 100, weighted by how much each one moves with training load and with how well you slept the night before.");
    expect(text.length).toBeGreaterThan(FOLD_MIN);
    const [lede, rest] = splitLede(text);
    expect(lede).toBe("Recovery is how ready your body is to take on strain today.");
    expect(rest).toMatch(/^It folds four signals/);
  });
  it("does not end a sentence at an abbreviation or a decimal", () => {
    const text = long("Some signals, e.g. HRV, move more than others; a change of 1.5 bpm is within the noise for most people today.", "Pulse therefore compares each one against its own spread over the last sixty nights rather than a fixed threshold.");
    expect(splitLede(text)[0]).toBe("Some signals, e.g. HRV, move more than others; a change of 1.5 bpm is within the noise for most people today.");
  });
  it("splits on other alphabets' capitals (Polish, Russian)", () => {
    expect(splitLede(long("Регенерация показывает, насколько организм готов к нагрузке сегодня.", "Она объединяет четыре сигнала в одно число от 0 до 100 с учётом того, как каждый из них меняется со сном."))[1]).toMatch(/^Она/);
    expect(splitLede(long("Regeneracja mówi, na ile organizm jest dziś gotowy na wysiłek i obciążenie.", "Łączy cztery sygnały w jedną liczbę od 0 do 100, ważąc każdy według tego, jak zmienia się z obciążeniem."))[1]).toMatch(/^Łączy/);
  });
  it("keeps a paragraph whole when what would fold is a few words", () => {
    const text = `${"A single long sentence that goes on and on about the measurement and its many caveats and conditions ".repeat(2)}here. Short end.`;
    expect(splitLede(text)[1]).toBeNull();
  });
});

describe("paragraph helpers", () => {
  it("are the kit's <P>, not a copy per screen", () => {
    const dirs = ["src/screens", "src/ui"];
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".tsx") ? [join(d, e.name)] : []));
    const copies = dirs.flatMap(walk).filter((f) => !f.endsWith("Prose.tsx") && /function P\(/.test(readFileSync(f, "utf8")));
    expect(copies).toEqual([]);
  });
});
