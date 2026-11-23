# Linear's mobile design, applied to Pulse

Date: 2026-11-23. Research behind the second design pass (type scale, reading text, grid, glass controls, motion). Linear
publishes no design system. The facts below come from its own posts, and the numbers come from third-party extractions of
its web app, so they are approximations. Pulse borrows Linear's principles, not its look: no screen copies one of Linear's.

## What Linear says about its mobile app

- **Redesign (Oct 2025).** A new visual system with a custom frosted-glass material, navigation rebuilt around a bottom
  toolbar, and a create action reachable from every screen
  ([changelog](https://linear.app/changelog/2025-10-16-mobile-app-redesign)).
- **Its own glass.** Built from blur, a faint gradient, a specular highlight, a mask in the control's shape and a soft
  shadow. Refraction is left out because it hurts reading in dense UI. With Increase Contrast on, glass gets a solid
  outline. Touching a control lifts it slightly with a quick pulse. Scroll views get a variable blur toward the top and
  bottom edges ([A Linear spin on Liquid Glass](https://linear.app/now/linear-liquid-glass)).
- **Hierarchy, balance, density.** The 2024 redesign reduced visual noise in the sidebar, tabs, headers and panels, and
  moved theme generation from HSL to LCH so colours of equal lightness look equally light. Inter Display is used for
  headings and Inter for text ([How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui),
  [new UI changelog](https://linear.app/changelog/2024-03-20-new-linear-ui)). The 2026 refresh made headers and view
  controls the same across views and dimmed the chrome so content leads
  ([UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh)).
- **Mobile patterns.** An inbox you act on with taps and swipes, compact reading, and native Swift and Kotlin apps
  ([linear.app/mobile](https://linear.app/mobile), [Inbox docs](https://linear.app/docs/inbox)).

## What Linear's iOS app shows (Mobbin, 2026 build)

Screens: [Inbox](https://mobbin.com/screens/986357ff-f066-4468-ae83-251d8aa2a2b5), [Inbox menu](https://mobbin.com/screens/f688fc71-2060-49c2-be67-bc6ab5e53bee),
[My issues](https://mobbin.com/screens/d40ca3c5-c489-4d10-bc89-2371840ae045), [issue](https://mobbin.com/screens/ed788cb0-3715-4383-9cbd-783d2a55bdf8),
[project overview](https://mobbin.com/screens/f8e3aa03-00f2-4985-a6ae-1055ae0f4144), [display options sheet](https://mobbin.com/screens/f02d53ae-347f-46d6-9ce4-96063f4edc90),
[project menu](https://mobbin.com/screens/f8a9de1f-ef1c-45e6-8db3-9239bdd5c690), [Search](https://mobbin.com/screens/e9b4ccc3-e76f-4594-acc4-1a43828e8e39).

- **Toolbar.** The toolbar is a glass capsule of four icons with no labels, and the current tab sits on a flat, light pill. Search is a separate glass circle beside it. A toast is a compact dark pill, with a tinted status icon, just above the toolbar.
- **Screen titles.** On root screens the title is left-aligned and bold, at about 22 to 24 pt ("Inbox", "My issues"), with actions in a glass capsule at the top right. Detail screens have a glass circle for Back on the left and a capsule of actions on the right. The title sits under a small, muted ID.
- **Rows.** Lists are flat rows with no cards and no dividers: a 15 pt title and a 13 pt muted second line. Groups take a small, muted header ("In Progress", "Recently viewed"). Page sections take a 15 pt header ("Activity").
- **Sheets and menus.** A sheet has a grabber, and its settings sit in inset grouped rows on a flat, light fill: label on the left, value and chevron on the right. Menus are blurred, rounded panels with icon rows and separators between groups. Destructive items are red.
- **Tabs and chips.** Text tabs mark the active one with a pill ("Assigned", "Created", "Subscribed"). Properties show as rounded chips at 13 pt.

## Measured: Linear's iOS type (Mobbin frames, 2026-11-23)

The frames are 1179 px wide, a 393 pt iPhone at 3x. Each size below comes from the cap height of a capital letter in the
frame, divided by Inter's cap height (0.727 em). The pixel measurement script is in the session notes. JPEG edges make
these read about 0.5 pt low.

| Text | Cap height | Size |
|---|---|---|
| Page title ("Inbox", an issue's title) | 17.0 pt | 24 |
| Nav title, text tabs ("Overview"), menu items | 12.3-12.7 pt | 17 |
| List rows (Inbox, My issues, Search, Settings), body, sheet rows | 11.3-11.7 pt | 16 |
| Section header ("Activity", "Row properties") | 10.7-11.0 pt | 15 |
| Row descriptions, chips, group labels ("Recently viewed") | 10.0 pt | 14 |
| IDs, timestamps ("ASM-6") | 8.3 pt | 12 |

A single-line row is 48 pt apart from the next (My issues, Search). The text gutter is 16 to 20 pt.

Pulse had set rows at 15, secondary text at 13 and labels at 11 to 12. Those are desktop sizes, a step under these. The
scale now follows the table: label 12, caption 13, meta 14, body 16, heading 17, value 20, title 24 (display, hero and
giant are unchanged for numerals). The small steps set their own line heights. The 421 hand-set `leading-*` classes that
the old arbitrary sizes needed are gone. Phones narrower than 402 pt ease type down by at most 4 %, not 8 %.

## Roles

`src/ui/type.ts` names what a piece of text is, and the shells use only these roles:

| Role | Class | Where |
|---|---|---|
| screenTitle | title 24 bold | Health, Journal, More |
| navTitle | heading 17 semibold | Detail headers and their date title |
| section | heading 17 semibold | Above cards ("Last night's readings") |
| cardTitle | body 16 semibold | A card's header. It was caption 13, under the card's own 16 px content |
| group | meta 14 medium, muted | Over a group of rows and in task pages ("Daytime", "Account & settings"). This replaces three styles, one of them ruled |
| rowTitle / rowSub | body 16 / meta 14 muted | Every list row: settings, metric rows, goals, activities, behaviours, the dashboard editor |
| tab | meta 14 medium | Segments and tabs |

Forms (`src/ui/Field.tsx`): a label is 14 px medium, and a qualifier ("Optional") stays at the label's size, a step quieter
in colour only. Before, "Optional" was 15 px beside a 12 px label. The hint or error below is also 14 px. Settings,
onboarding, the coach and the log sheets now share this one label. Before, there were two `Field`s that disagreed.

Lists (`LinkList`): the rows of a group sit in one card with inset hairlines, as Linear's grouped lists, not one floating
card per row.

## What extractions measure (approximate)

- Inter Variable with the cv01 and ss03 features, at in-between weights of about 510 and 590.
- A 13 px tier for navigation and metadata, with about 1.5× line height and slight negative tracking. Display sizes
  tighten to about −0.022 em.
- Body text is reported as 14, 15 or 16 px, depending on the source.

Sources: [refero](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1),
[duply](https://duply.ai/linear/design-md), [oh-my-design](https://oh-my-design.kr/design-systems/linear.app),
[typescale.app](https://typescale.app/typescales/typescale-and-typography-system-of-linear),
[designlang](https://designlang.app/design-system/linear),
[designsystems.one](https://www.designsystems.one/design-systems/linear) (which notes that the system is internal).

Motion guidance from React Native practice:
- a Linear-style tab bar whose pill morphs on a spring, with light haptics ([rnmotion](https://rnmotion.dev/animations/linear-tab-bar));
- animations run on the UI thread, springs carry gesture velocity, and haptics are timed with care ([dev.to](https://dev.to/oddeggs/how-we-made-an-expo-app-feel-native-reanimated-4-real-form-sheets-and-haptics-244c)).

## What Pulse does with it

| Principle | Before | Now |
|---|---|---|
| One type scale | 21 arbitrary sizes (`text-[9px]` to `text-[64px]`) plus 8 Tailwind sizes, 29 in all | Ten named steps in `tailwind.config.js`, each with its line height and Inter's optical tracking: label 11, caption 12, meta 13, body 15, heading 17, value 20, title 22, display 30, hero 40, giant 64. `src/ui/typeScale.test.ts` fails on any other size. `cn` knows the steps, so a size is never merged away as a colour |
| Quiet section headers | Section titles at 22 px | Section titles are body 15 semibold, as Linear's "Activity"; detail titles are body 15 semibold (`HEADER_TITLE`) |
| Left-aligned root titles | Health, Journal and More centred their title at 12 px | A bold, left-aligned 22 px title (`ROOT_TITLE`), as Linear's Inbox |
| Glass header controls | Back, close and the info "i" were bare icons | Each sits in a 40 px glass circle that lifts when pressed (`HeaderButton`) |
| An icon toolbar | A 62 px squircle with four icon-and-label tabs and a gradient lens | A 56 px capsule of icons with a flat sliding pill; the check-in action is a round glass button beside it |
| Toast | Full-width card at the screen's foot | A compact pill above the bar, with a status-tinted icon |
| Lead with one sentence | Paragraphs up to 540 characters in info dialogs, factor explanations and insight cards | `<Prose>` (`src/ui/Prose.tsx`) shows a long paragraph's first sentence in the foreground colour; **More** fades the rest in beneath it, one step quieter. Short text shows in full. One `<P>` replaces the four copies the screens had. The sentence splitter knows abbreviations and capitals in all eight languages (`prose.test.ts`). How it works stays a full reading page |
| Two levels in a card | Home insight cards: a 15 px title over 15 px body | A 15 px semibold title over 13 px secondary text |
| A 4 px grid | Paddings and gaps of 10 and 14 px, card insets of 16 and 20 | 10 px becomes 8 for gaps and 12 for padding, 14 becomes 16, card insets are 16. The scale test also guards the grid |
| Glass that responds to touch | The tab bar and check-in action shrank to 96 % on press | They lift to 106 % and 105 % on a spring and settle back with a short pulse (`Press` with `activeScale > 1`, `SPRING.lift`) |
| A pill that morphs | The tab lens slid on a 150 ms timing | It glides on a critically damped spring (`SPRING.snappy`) |
| Scroll edges | Content ran hard under the floating bar | A gradient fades content into the background toward the foot of tab screens. Android stays without a live blur, for 120 Hz scrolling (see `Glass`) |
| Reduced motion | — | Springs, the lens and Prose's fade fall back to the plain 150 to 200 ms timings or no animation |

Left as they were: navigation pushes (`ios_from_right` on Android, native on iOS), the 200 ms tab shift, and haptics. These
already follow the platform vocabulary (`src/ui/haptics.ts`).

## Mark

The old mark was two filled pills in teal and blue. Nothing in it matched the wordmark, which is monoline and mono with
one device: the L's foot runs on as a heartbeat into the S. The new mark is a symbol drawn by the wordmark's rules
(`markPath` in `src/ui/brand.tsx`):

- a frame in the wordmark's stroke (3.2 on a 20-unit cap height) with its radius-5 corners, the top-left one square
  like the P's;
- the wordmark's beat, with the same spike width and sharp joins and a 2.5 dip, running wall to wall at 54 % of the
  height. Its rise is 6, not 7.5, so the spike clears the frame's top;
- mono: near-white on the near-black launcher tile, and the text colour in the app.

Rejected in the study: a P monogram (a letter, not a symbol), the beat inside the P's bowl (it read as "AP"), a P with a
beat tail (read as "DA"), the beat alone (every health app's icon), and the beat on the frame's base (read as a speech
bubble or a "W"). The launcher, adaptive, monochrome, tinted and splash icons are all rendered from the same path. The
opening animation and the welcome hero beat the mark once (lub-dub), with no coloured glow.

## Alignment

- An icon beside text that can wrap sits on the text's first line (`LineIcon`, `items-start`). This applies to chips,
  notes, warnings, toasts and links with an arrow. Centred, it floats between two lines.
- A chip's mark is 6 px from its text, and a chip that wraps stays a chip.
- Tiles side by side are the height of the taller one, with their values top-aligned, so a wrapped chip does not leave
  the row uneven.
- A title over its hint or second line sits 4 px above it, in every settings row, list and card. Settings rows have
  12 px above and below.
