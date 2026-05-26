# Style Guide

Guidelines for designers and developers consuming `@ds/core`. Tokens are the law; this doc is the
common-law layer on top of them.

---

## 1 · Composition over configuration

Reach for **named subcomponents** before reaching for props. `Card.Header > Card.Title >
Card.Description` is preferred over `<Card title="…" subtitle="…">`. Composition keeps the API
small and makes layout overridable without prop explosion.

```tsx
// Good
<Card>
  <Card.Header>
    <Card.Title>Vault snapshot</Card.Title>
    <Card.Description>Updated 12:04 UTC</Card.Description>
  </Card.Header>
  <Card.Body>{metrics}</Card.Body>
  <Card.Footer>{actions}</Card.Footer>
</Card>

// Avoid
<Card
  title="Vault snapshot"
  subtitle="Updated 12:04 UTC"
  body={metrics}
  footer={actions}
/>
```

Same shape applies to `Modal`, `Drawer`, `Sidebar`, `Topbar`, `Tabs`, `Dropdown`, `Popover`,
`Sheet`, `ContextMenu`, `Timeline`, `Breadcrumb`, `Kanban`.

---

## 2 · Spacing — a rhythmic scale

The scale is **4-8-16-32** dominated. Use bigger steps less often.

| Step | Use it for |
|---|---|
| `--ds-spacing-1` (4px) | Tight clusters, icon-to-text inside a button |
| `--ds-spacing-2` (8px) | Button inner X, gap between adjacent badges |
| `--ds-spacing-3` (12px) | Small card padding, list row gutter |
| `--ds-spacing-4` (16px) | **Default gap inside a component** |
| `--ds-spacing-6` (24px) | **Default card padding** |
| `--ds-spacing-8` (32px) | Gap between sections inside a page |
| `--ds-spacing-12` (48px) | Topbar height; gap between major page sections |
| `--ds-spacing-16` (64px) | Hero block vertical padding |
| `--ds-spacing-24` (96px) | Page-level vertical rhythm on marketing |

Rule of thumb: if you reach for spacing `5`, `7`, `9`, `11`, you are probably hand-fitting. Step
back and snap to `4`, `6`, `8`, `12`. The rhythm is what makes the UI feel calm.

### Hierarchy is encoded in spacing more than in size

A heading next to its body shouldn't whisper its hierarchy via font size alone. Add a deliberate
gap (`--ds-spacing-2` between a title and its subtitle; `--ds-spacing-6` to the body). Density tier
multiplies the entire scale via `--ds-density`.

---

## 3 · Typography hierarchy

Three families, three intents.

| Tier | Token | When |
|---|---|---|
| **Display** | `--ds-font-size-display-{sm\|md\|lg}` | Hero blocks, landing pages, one per page max |
| **Heading** | `--ds-font-size-h{1..6}` | Page / section structure |
| **Body** | `--ds-font-size-body-{md\|lg}` + `sm` for ancillary | Paragraphs, descriptions, inputs |
| **Caption** | `--ds-font-size-xs` | Footnotes, helper text, legal |

### Pairing rules

- A page has **one H1**. Never two.
- An H2 introduces a top-level section. Skipping levels (H1 → H3) is a smell.
- Body comes in two sizes (`body-md` default, `body-lg` for lead paragraphs in marketing).
- Captions are `xs`, never smaller. If you need smaller, the content is hidden — remove it instead.
- Mono font (`--ds-font-mono`) is reserved for tabular numbers (KPI, table values, code).

```tsx
<h1 className="ds-h1">Hearst Yield Vault</h1>          // 48px / 700 / -0.02em
<p  className="ds-body-lg">Monthly distributions…</p>   // 18px / 400 / 1.5
<p  className="ds-body-md">Cayman SPV structure…</p>    // 16px / 400 / 1.5
<p  className="ds-caption">Past performance is not…</p> // 12px / 400 / 1.5
```

---

## 4 · Button variants — when to use which

The button is the most over-prop'd component in any DS. Default to **one primary action per
view**.

| Variant | Visual | Use |
|---|---|---|
| `primary` | Filled, brand color | The one main action. Submit, Confirm, Continue. |
| `secondary` | Filled, neutral surface | Supporting action next to primary. Cancel, Back. |
| `ghost` | Transparent, hover surface | Tertiary actions, toolbar buttons |
| `outline` | Border only | Inline actions inside a card, "Add" / "Edit" links |
| `destructive` | Filled, status-error | Delete, Revoke, Disconnect — irreversible |
| `link` | Text only | Inline within a paragraph |

### One primary rule

```
[ Primary CTA ]   [ Secondary ]   [ Ghost ]
```

If two primaries fight on the same view, one of them is actually a secondary. Demote it.

### Destructive needs confirmation

Any `destructive` button that can't be undone in <5s must be paired with a `Modal` or `Popover`
confirmation step. Don't ship a single-click "Delete forever".

---

## 5 · Anti-patterns

Patterns that get caught at code review and during the `ds-tokens` audit.

### 5.1 · Hardcoded values

```css
/* BAD */
.kpi { color: #A7FB90; padding: 16px; border-radius: 8px; }

/* GOOD */
.kpi {
  color: var(--ds-color-accent-500);
  padding: var(--ds-spacing-4);
  border-radius: var(--ds-radius-md);
}
```

CI runs `pnpm ds:tokens` (see `/cockpit-adrien fix`) and flags any `#hex`, `px` outside `1px`
hairlines, or unprefixed CSS vars in our source.

### 5.2 · Tailwind arbitrary values

```tsx
// BAD
<div className="p-[14px] text-[15px] bg-[#A7FB90]" />

// GOOD
<div className="ds:p-4 ds:text-body-md ds:bg-accent-500" />
```

Arbitrary values bypass the scale. The Tailwind preset (`src/tailwind/preset.ts`) exposes every
token as a utility — use those.

### 5.3 · Nested cards (depth > 2)

A Card inside a Card inside a Card is a structure smell. Two levels is the max. Beyond that, use
`Tabs`, `Sections`, or split the screen — visual nesting becomes noise past 2 levels and breaks
elevation cues.

```tsx
// BAD
<Card>
  <Card>
    <Card>
      <Metric />
    </Card>
  </Card>
</Card>

// GOOD
<Card>
  <Card.Body>
    <section className="ds:space-y-4">
      <Metric />
    </section>
  </Card.Body>
</Card>
```

### 5.4 · Variant juggling instead of composition

If you have a `Card` with `variant="dashboard-kpi-large-with-spark-on-top"`, you've outgrown
variants — compose with subcomponents instead. Variants are for *visual style*, not *layout
intent*.

### 5.5 · Custom colors per page

Custom colors per route ("the analytics page is teal, the billing page is amber") is a brand
mistake disguised as a system. If a page needs a unique accent, it earns a *theme*, not a hex code.

### 5.6 · Disabled without explanation

A grayed-out button with no tooltip is hostile UX. Wrap disabled actions in `<Tooltip
content="Connect a wallet first">`. The user must know why.

### 5.7 · Truncation without overflow

Long text truncated with `…` and no expand affordance is rude. Add `title=`, a tooltip, or expand
on click. Truncation must be lossless from the user's standpoint.

### 5.8 · Shadow without elevation logic

A floating button on a flat page with a `--ds-shadow-2xl` looks like a stray badge. Use the
shadow scale as a depth ladder:

- `xs / sm` — hairline elevation, table rows on hover
- `md` — dropdown, popover
- `lg` — drawer, sheet
- `xl` — modal
- `2xl` — command palette, spotlight

Never `2xl` on a card sitting flat inside a section.

### 5.9 · Motion without purpose

If an animation doesn't convey *causality* or *continuity*, remove it. A KPI that pulses for no
reason adds noise. Animations earn their tokens (`fast` / `base` / `moderate`) by mapping to a
user event.

### 5.10 · "Just one more click"

Hidden actions deeper than 2 clicks are forgotten actions. If something matters, surface it in
the topbar or sidebar. If it can be 3 clicks deep, it can be removed.

---

## 6 · Density — compact / comfortable / spacious

`--ds-density` multiplies the entire spacing scale at runtime.

| Tier | `--ds-density` | When |
|---|---|---|
| `compact` | `0.875` | Data-dense surfaces: tables, dashboards, admin consoles |
| `comfortable` | `1` (default) | Standard product UI |
| `spacious` | `1.125` | Marketing, onboarding, accessibility preference, large displays |

Set per scope:

```tsx
<main data-ds-density="compact">
  <DataGrid />
</main>
```

### When to switch

- **Always** offer the user a control if your product has a power-user surface (admin, ops
  console). Don't pick density for them.
- **Never** mix densities at the component level. Density is a region, not a sprinkle.
- A `compact` table with `spacious` buttons looks broken. Pick one per region.

---

## 7 · Surface and elevation cheat-sheet

| Surface | Background token | Border | Shadow |
|---|---|---|---|
| Page body | `--ds-color-bg-base` | none | `--ds-shadow-none` |
| Resting card | `--ds-color-bg-raised` | `--ds-color-border-subtle` | `--ds-shadow-sm` |
| Hovered card | `--ds-color-bg-raised` | `--ds-color-border-default` | `--ds-shadow-md` |
| Dropdown | `--ds-color-bg-overlay` | `--ds-color-border-default` | `--ds-shadow-md` |
| Popover | `--ds-color-bg-overlay` | `--ds-color-border-default` | `--ds-shadow-lg` |
| Modal | `--ds-color-bg-overlay` | `--ds-color-border-default` | `--ds-shadow-xl` |
| Command palette | `--ds-color-bg-overlay` | `--ds-color-border-default` | `--ds-shadow-2xl` |
| Sunken (inputs) | `--ds-color-bg-sunken` | `--ds-color-border-default` | `--ds-shadow-inner` |

Elevation is monotonic: a popover above a card has a stronger shadow; a modal above the popover
stronger still. Don't break the ladder.

---

## 8 · Forms — a few hard rules

1. **Labels are not optional.** Every input has a visible label. Placeholders are not labels.
2. **Required is marked** with the locale convention (`*` in EN, sometimes inverted in JP). The DS
   defaults to `*` red.
3. **Errors live below the input**, never as a tooltip-only.
4. **Submit button is the primary action of the form.** Never put two primaries in a form.
5. **Inputs that mutate state on blur**, not on every keystroke (except `Combobox` filter).
6. **Date / number / currency** inputs use mono font for tabular nums.

```tsx
<form className="ds:space-y-6">
  <Input label="Email" required type="email" />
  <Input label="Amount" required type="number" prefix="$" />
  <Button type="submit" variant="primary">Continue</Button>
</form>
```

---

## 9 · Color — restraint over reach

A view should be readable without color. Color *reinforces* meaning, doesn't *create* it.

- A green "Live" badge is also tagged with the word "Live".
- A red "Stale" badge is also tagged with the word "Stale".
- Charts use shape (`solid` vs `dashed`) in addition to color.

This unlocks free monochrome theme support and protects color-vision-deficient users.

### Accent should be ≤10% of pixels

Brand color is precious. If 40% of the screen is brand color, the brand isn't accenting — it's
shouting. Aim for accent ≤10% of pixels; the rest is the neutral grayscale ramp.

---

## 10 · Iconography

Use a consistent icon family across the product. The DS defaults to `lucide-react` sized via:

| Token | Size |
|---|---|
| `--ds-icon-sm` | 16px |
| `--ds-icon-md` | 20px |
| `--ds-icon-lg` | 24px |
| `--ds-icon-xl` | 32px |

Icons inside buttons match the button text size (1.25 × cap-height).

```tsx
<Button><PlusIcon className="ds:size-md" /> New</Button>
```

---

## 11 · When to break the rules

This guide is a default, not a fence.

- A demo / experiment can hardcode for a day. It can't merge to `main`.
- A spike UI can use any color. It can't ship to a tenant.
- Marketing landing can break density rhythm to attract attention; the product UI inside the same
  app cannot.

If you find yourself fighting this guide repeatedly for the same reason, the system is wrong —
file an ADR in `docs/decisions/` proposing the new rule.

---

## 12 · Audits you can run

These slash commands (see `~/.claude/commands/`) sweep the codebase for guide violations:

- `/ds-tokens` — no hardcoded colors / px / radii
- `/ds-spacing` — paddings/margins/gaps come from the scale
- `/ds-typo` — fonts, sizes, weights, tracking, line-height, tabular nums
- `/ds-radius` — border-radius values come from the scale
- `/ds-shadows` — shadows come from the scale
- `/ds-motion` — durations / easings / transitions
- `/ds-charts` — SVG canonical dasharray and rotation
- `/ds-primitives` — no inline re-implementations of primitives
- `/ds-classes` — no arbitrary `.ct-*` classes invented locally
- `/ds-layout` — bento grid, rails, halo, alignments
- `/ds-dark` — no `dark:` modifiers (theming is data-attribute driven)
- `/ds-full` — runs all of the above

Pre-commit hook on this package runs `ds-full` automatically.
