import { extendTailwindMerge } from "tailwind-merge";

// The web's `cn` (the `cn` package: clsx + tailwind-merge): joins class names, skipping falsy values, and a later class
// overrides an earlier one of the same kind (`cn("py-4", "py-0")` is "py-0"), so a component's base classes can be
// overridden by its `className` exactly as on the web. tailwind-merge v2 matches this project's Tailwind 3; it learns
// the one radius the web added (`rounded-4xl`) and the type scale's step names (tailwind.config.js `fontSize`), which it
// would otherwise read as colours, so `cn("text-caption", "text-foreground")` would drop the size.
export const TYPE_STEPS = ["label", "caption", "meta", "body", "heading", "value", "title", "display", "hero", "giant"] as const;
const merge = extendTailwindMerge({ extend: { theme: { borderRadius: ["4xl"] }, classGroups: { "font-size": [{ text: [...TYPE_STEPS] }] } } });

export const cn = (...parts: (string | false | null | undefined)[]) => merge(parts.filter(Boolean).join(" "));
