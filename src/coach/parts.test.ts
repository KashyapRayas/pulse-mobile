import { describe, expect, it } from "vitest";
import { answerBlocks, toolsUsed } from "./parts";

describe("answerBlocks", () => {
  it("groups consecutive tool calls into one run of steps, across step markers", () => {
    const blocks = answerBlocks([
      { type: "step-start" },
      { type: "tool-get_day", state: "output-available", output: { day: "2026-11-28" } },
      { type: "step-start" },
      { type: "tool-get_sleep", state: "input-available" },
      { type: "text", text: "Here is your day." },
    ]);
    expect(blocks).toEqual([
      {
        kind: "steps",
        steps: [
          { name: "get_day", state: "done", output: { day: "2026-11-28" } },
          { name: "get_sleep", state: "running", output: undefined },
        ],
      },
      { kind: "text", text: "Here is your day." },
    ]);
  });

  it("splits runs at text and skips blank text", () => {
    const blocks = answerBlocks([
      { type: "tool-get_day", state: "output-error" },
      { type: "text", text: "  " },
      { type: "tool-get_trend", state: "output-available" },
      { type: "text", text: "First." },
      { type: "tool-get_health", state: "input-streaming" },
    ]);
    expect(blocks.map((b) => (b.kind === "text" ? b.text : b.steps.map((s) => `${s.name}:${s.state}`)))).toEqual([["get_day:failed", "get_trend:done"], "First.", ["get_health:running"]]);
  });

  it("has nothing for an empty answer", () => {
    expect(answerBlocks([])).toEqual([]);
    expect(answerBlocks([{ type: "step-start" }, { type: "text", text: "" }])).toEqual([]);
  });
});

describe("toolsUsed", () => {
  it("lists tools that returned, once each, in first-use order", () => {
    expect(
      toolsUsed([
        { type: "tool-get_sleep", state: "output-available" },
        { type: "tool-get_day", state: "output-error" },
        { type: "text", text: "x" },
        { type: "tool-get_trend", state: "output-available" },
        { type: "tool-get_sleep", state: "output-available" },
        { type: "tool-get_health", state: "input-available" },
      ]),
    ).toEqual(["get_sleep", "get_trend"]);
  });
});
