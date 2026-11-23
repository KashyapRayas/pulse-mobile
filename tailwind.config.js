/* global __dirname */
const fs = require("node:fs");
const path = require("node:path");

// Pulse's design tokens as a Tailwind theme (pulse src/app/globals.css, "@theme inline"): the same colour names,
// the same radius scale, the same type scale, so a class written for the web (bg-card, text-recovery-red-text,
// rounded-2xl, text-[15px]) means the same thing here.

// Colours: every variable declared in the :root block of global.css becomes a colour of the same name. A variable
// holding "R G B" channels gets rgb(var(--x) / <alpha-value>), so opacity modifiers (bg-foreground/10) work; one that
// holds a whole rgb(... / a) already has its alpha and is used as is. Anything else (a box shadow, the orb's scalars) is
// not a colour and is left out: src/ui/shadow.ts applies the shadows from palette.ts. Reading global.css here means a
// token is added in one place only.
const css = fs.readFileSync(path.join(__dirname, "global.css"), "utf8");
const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
const colors = {};
for (const [, name, raw] of root.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  const value = raw.trim();
  if (value.startsWith("rgb(")) colors[name] = `var(--${name})`;
  else if (/^\d+ \d+ \d+$/.test(value)) colors[name] = `rgb(var(--${name}) / <alpha-value>)`;
}
// A disabled control's opacity, as the class opacity-disabled (written out: an opacity utility cannot read a variable here).
const disabledOpacity = /--disabled-opacity:\s*([\d.]+);/.exec(root)?.[1];

// NativeWind turns 1rem into 14 px (react-native-css-interop's default `inlineRem`), where the web means 16 px.
// So every scale that Tailwind writes in rem is restated in px here, and nothing below uses rem.
const spacing = { 0: "0px", px: "1px" };
for (let n = 0.5; n <= 96; n += 0.5) spacing[String(n)] = `${n * 4}px`;

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Class strategy: global.css defines the dark tokens under `.dark:root`, and the app toggles it (colorScheme.set).
  darkMode: "class",
  theme: {
    // Replaces Tailwind's palette: only Pulse's tokens (plus the ones every scale needs).
    colors: { ...colors, transparent: "transparent", current: "currentColor" },
    spacing,
    // Tailwind's rem-based radii, restated in px with the web app's names, on Linear's tighter scale: swatches 2, chips 4,
    // inputs 6, rows and buttons 8, cards 10, info card 12, sheets 16. src/ui/radius.ts holds the same numbers.
    borderRadius: { none: "0px", xs: "2px", sm: "4px", DEFAULT: "4px", md: "6px", lg: "8px", xl: "8px", "2xl": "10px", "3xl": "12px", "4xl": "16px", full: "9999px" },
    // The one type scale, measured off Linear's iOS app (docs/design/linear-mobile.md "Measured"): ten steps, each with
    // its line height and Inter's optical tracking. Rows and reading text are 16, as on a phone, not a desktop's 13-15.
    // No other size is written anywhere (src/ui/typeScale.test.ts), and the small steps carry no `leading-*` of their
    // own (the steps set it); a `tracking-*` class still overrides a step's.
    fontSize: {
      label: ["12px", { lineHeight: "16px", letterSpacing: "0px" }], // chart axes, tile captions, tiny tags
      caption: ["13px", { lineHeight: "18px", letterSpacing: "-0.03px" }], // units, timestamps, chips, field labels' hints
      meta: ["14px", { lineHeight: "20px", letterSpacing: "-0.08px" }], // secondary text, descriptions, field labels
      body: ["16px", { lineHeight: "22px", letterSpacing: "-0.18px" }], // row titles, inputs and reading text
      heading: ["17px", { lineHeight: "24px", letterSpacing: "-0.22px" }], // nav titles, sheet titles, menu items
      value: ["20px", { lineHeight: "26px", letterSpacing: "-0.34px" }], // a stat in a row
      title: ["24px", { lineHeight: "30px", letterSpacing: "-0.46px" }], // screen titles
      display: ["30px", { lineHeight: "36px", letterSpacing: "-0.62px" }], // a card's hero number
      hero: ["40px", { lineHeight: "44px", letterSpacing: "-0.88px" }], // a live readout
      giant: ["64px", { lineHeight: "64px", letterSpacing: "-1.41px" }], // a screen's score
    },
    lineHeight: { none: "1", tight: "1.25", snug: "1.375", normal: "1.5", ...Object.fromEntries([3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, `${n * 4}px`])) },
    maxWidth: { none: "none", full: "100%", ...spacing },
    extend: {
      // The web's Tailwind 4 accepts any whole percent in a colour modifier (bg-foreground/8); Tailwind 3 knows steps of 5.
      opacity: { 8: "0.08", 12: "0.12", 16: "0.16", disabled: disabledOpacity },
      // React Native picks a font by its exact family name, not by family plus weight, so each weight is its own
      // name. <Text> in src/ui/Text.tsx maps the web's font-sans / font-numeric / font-bold classes onto these.
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
        numeric: ["Inter_500Medium"],
        "numeric-medium": ["Inter_500Medium"],
        "numeric-semibold": ["Inter_600SemiBold"],
        "numeric-bold": ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
