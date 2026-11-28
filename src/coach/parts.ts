// How an answer's parts show on screen: its text blocks, and each run of tool calls between them as one group of steps
// ("Looked at 3 things"), as Claude and ChatGPT fold their tool use into one line. Pure: the screen renders the result.

/** The part fields this needs: a UI message part is `text`, `tool-<name>` (with a state) or a marker such as `step-start`. */
export type PartLike = { type: string; text?: string; state?: string; output?: unknown };

export type StepState = "running" | "done" | "failed";
export type Step = { name: string; state: StepState; output: unknown };
export type Block = { kind: "text"; text: string } | { kind: "steps"; steps: Step[] };

const stepState = (state: string | undefined): StepState => (state === "output-available" ? "done" : state === "output-error" ? "failed" : "running");

/**
 * The blocks of an answer in order. Consecutive tool calls make one `steps` block; markers and blank text between them
 * do not break the run, so a turn that looks things up over several model steps still reads as one group.
 */
export function answerBlocks(parts: readonly PartLike[]): Block[] {
  const out: Block[] = [];
  for (const p of parts) {
    if (p.type === "text") {
      if (!p.text?.trim()) continue;
      out.push({ kind: "text", text: p.text });
    } else if (p.type.startsWith("tool-")) {
      const step: Step = { name: p.type.slice(5), state: stepState(p.state), output: p.output };
      const last = out.at(-1);
      if (last?.kind === "steps") last.steps.push(step);
      else out.push({ kind: "steps", steps: [step] });
    }
  }
  return out;
}

/** The tools an answer used successfully, in the order it first used them. */
export function toolsUsed(parts: readonly PartLike[]): string[] {
  const names: string[] = [];
  for (const p of parts) {
    if (!p.type.startsWith("tool-") || p.state !== "output-available") continue;
    const name = p.type.slice(5);
    if (!names.includes(name)) names.push(name);
  }
  return names;
}
