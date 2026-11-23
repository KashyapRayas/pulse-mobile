// Type roles (docs/design/linear-mobile.md "Roles"). A role says what a piece of text is, and the kit's shells,
// headers, rows and fields style that kind of text only through these. So a card title, a group label or a row's
// second line looks the same on every screen. The steps are tailwind.config.js `fontSize`, measured off Linear's iOS
// app: rows and reading text 16, nav titles 17, screen titles 24.
export const TYPE = {
  /** A tab root's title (Health, Journal, More): Linear's left-aligned bold title. */
  screenTitle: "text-title font-bold",
  /** A detail screen's centred title, and the date standing in for it. */
  navTitle: "text-heading font-semibold",
  /** A section's title above its cards ("Last night's readings", "Today's food"). */
  section: "text-heading font-semibold",
  /** A card's own title, in its header row: a step under the section, never under the card's content. */
  cardTitle: "text-body font-semibold",
  /** A small label over a group of rows ("Account & settings", "Daytime"). */
  group: "text-meta font-medium text-muted-foreground",
  /** A list row's title. */
  rowTitle: "text-body",
  /** A list row's second line. */
  rowSub: "text-meta text-muted-foreground",
  /** A short value at a row's end ("Nov 16 - Nov 22", "Enabled"). */
  rowAside: "text-meta text-muted-foreground tabular-nums",
  /** A tab, a segment or a filter chip. */
  tab: "text-meta font-medium",
} as const;
