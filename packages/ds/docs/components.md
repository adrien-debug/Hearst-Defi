# Component Catalog

`@ds/core` ships **45 primitives**, organized in 4 categories. Each lives under
`packages/ds/src/primitives/<name>/` with the file layout fixed in `CONTRACT.md §4`.

All examples assume:

```ts
import { /* see each section */ } from "@ds/core";
```

---

## Form (10)

Inputs, selectors, and editable controls. Owned by Agent E (`src/primitives/{button,icon-button,input,textarea,select,checkbox,radio,switch,slider,combobox}/**`).

### Button

Polymorphic button with variants `primary | secondary | ghost | outline | destructive | link`, sizes
`sm | md | lg`, and `loading` / `disabled` states. Supports `asChild` to render as `<a>`, `<Link>`,
etc. See `src/primitives/button/README.md`.

```tsx
import { Button } from "@ds/core";
<Button variant="primary" size="md" loading={isSaving}>Save</Button>
<Button asChild variant="link"><a href="/docs">Read docs</a></Button>
```

### IconButton

Square button optimized for an icon-only target, with mandatory `aria-label`. Sizes `sm | md | lg`
align with `Button`. See `src/primitives/icon-button/README.md`.

```tsx
import { IconButton } from "@ds/core";
<IconButton aria-label="Close" variant="ghost"><X /></IconButton>
```

### Input

Text input with `prefix`, `suffix`, `error`, `description` slots. Auto-wires `aria-describedby` and
`aria-invalid`. See `src/primitives/input/README.md`.

```tsx
import { Input } from "@ds/core";
<Input label="Email" type="email" required error={errors.email} description="We never share it." />
```

### Textarea

Auto-grow textarea with min/max rows, character counter slot, and the same error/description
contract as `Input`. See `src/primitives/textarea/README.md`.

```tsx
import { Textarea } from "@ds/core";
<Textarea label="Notes" minRows={3} maxRows={12} maxLength={500} />
```

### Select

Native-feeling select with custom popup, keyboard navigation (`↑↓`, type-ahead), and
`<SelectGroup>` / `<SelectItem>` composition. See `src/primitives/select/README.md`.

```tsx
import { Select, SelectItem } from "@ds/core";
<Select label="Currency" defaultValue="USDC">
  <SelectItem value="USDC">USDC</SelectItem>
  <SelectItem value="ETH">ETH</SelectItem>
</Select>
```

### Checkbox

Boolean control with indeterminate state. Supports `checked`, `defaultChecked`, `disabled`,
`indeterminate`. See `src/primitives/checkbox/README.md`.

```tsx
import { Checkbox } from "@ds/core";
<Checkbox label="I agree to the terms" required />
```

### Radio

Radio group with `RadioGroup` parent for shared `name` / `value`. Arrow-key navigation built in.
See `src/primitives/radio/README.md`.

```tsx
import { RadioGroup, Radio } from "@ds/core";
<RadioGroup name="plan" defaultValue="pro">
  <Radio value="free" label="Free" />
  <Radio value="pro" label="Pro" />
</RadioGroup>
```

### Switch

On/off toggle, accessible (`role="switch"`). Sizes `sm | md`. See `src/primitives/switch/README.md`.

```tsx
import { Switch } from "@ds/core";
<Switch label="Email notifications" defaultChecked />
```

### Slider

Single or range slider, keyboard nav, label tooltip. Built on Radix Slider. See
`src/primitives/slider/README.md`.

```tsx
import { Slider } from "@ds/core";
<Slider label="APY ceiling" min={5} max={20} step={0.1} defaultValue={[12]} />
```

### Combobox

Autocomplete combobox with async loading, virtualized list, multi-select. See
`src/primitives/combobox/README.md`.

```tsx
import { Combobox } from "@ds/core";
<Combobox
  label="Country"
  options={countries}
  onSearch={fetchCountries}
  placeholder="Type to filter…"
/>
```

---

## Layout (12)

Surfaces, overlays, navigation chrome. Owned by Agent F
(`src/primitives/{card,modal,drawer,dropdown,tabs,tooltip,popover,toast,sidebar,topbar,context-menu,sheet}/**`).

### Card

Surface primitive with composable parts `Card.Header`, `Card.Title`, `Card.Description`,
`Card.Body`, `Card.Footer`. Variants `default | elevated | outlined | ghost`. See
`src/primitives/card/README.md`.

```tsx
import { Card } from "@ds/core";
<Card variant="elevated">
  <Card.Header>
    <Card.Title>Vault snapshot</Card.Title>
    <Card.Description>Last updated 12:04 UTC.</Card.Description>
  </Card.Header>
  <Card.Body>{children}</Card.Body>
</Card>
```

### Modal

Centered dialog, scroll-locked, focus-trapped, ESC-dismissable. Compose with `Modal.Trigger`,
`Modal.Content`, `Modal.Header`, `Modal.Footer`. See `src/primitives/modal/README.md`.

```tsx
import { Modal, Button } from "@ds/core";
<Modal>
  <Modal.Trigger asChild><Button>Open</Button></Modal.Trigger>
  <Modal.Content title="Confirm deletion">…</Modal.Content>
</Modal>
```

### Drawer

Slide-in panel from `left | right | top | bottom`. Same a11y contract as `Modal`. See
`src/primitives/drawer/README.md`.

```tsx
import { Drawer } from "@ds/core";
<Drawer side="right">
  <Drawer.Trigger>Open settings</Drawer.Trigger>
  <Drawer.Content>{settings}</Drawer.Content>
</Drawer>
```

### Dropdown

Menu attached to a trigger. Supports nested submenus, keyboard nav, type-ahead.
See `src/primitives/dropdown/README.md`.

```tsx
import { Dropdown } from "@ds/core";
<Dropdown>
  <Dropdown.Trigger>Actions</Dropdown.Trigger>
  <Dropdown.Content>
    <Dropdown.Item onSelect={onEdit}>Edit</Dropdown.Item>
    <Dropdown.Separator />
    <Dropdown.Item variant="destructive">Delete</Dropdown.Item>
  </Dropdown.Content>
</Dropdown>
```

### Tabs

Horizontal or vertical tab panel. Auto-roving tabindex. See `src/primitives/tabs/README.md`.

```tsx
import { Tabs } from "@ds/core";
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">…</Tabs.Content>
</Tabs>
```

### Tooltip

Small label on hover/focus. Delay configurable, supports `side="top|right|bottom|left"`. See
`src/primitives/tooltip/README.md`.

```tsx
import { Tooltip, IconButton } from "@ds/core";
<Tooltip content="Refresh">
  <IconButton aria-label="Refresh"><RefreshIcon /></IconButton>
</Tooltip>
```

### Popover

Anchored overlay with arbitrary content. Differs from `Tooltip` by being interactive. See
`src/primitives/popover/README.md`.

```tsx
import { Popover } from "@ds/core";
<Popover>
  <Popover.Trigger>Filter</Popover.Trigger>
  <Popover.Content><FilterForm /></Popover.Content>
</Popover>
```

### Toast

Non-blocking notification, queued, auto-dismiss with progress bar. Variants
`info | success | warning | error`. See `src/primitives/toast/README.md`.

```tsx
import { useToast } from "@ds/core";
const { toast } = useToast();
toast({ title: "Saved", description: "Changes persisted.", variant: "success" });
```

### Sidebar

Collapsible left/right rail with `Sidebar.Section`, `Sidebar.Item`, `Sidebar.Footer`. See
`src/primitives/sidebar/README.md`.

```tsx
import { Sidebar } from "@ds/core";
<Sidebar collapsible>
  <Sidebar.Section title="Workspace">
    <Sidebar.Item icon={<Home />}>Dashboard</Sidebar.Item>
    <Sidebar.Item icon={<Vault />}>Vaults</Sidebar.Item>
  </Sidebar.Section>
</Sidebar>
```

### Topbar

Sticky horizontal nav with `Topbar.Logo`, `Topbar.Nav`, `Topbar.Actions`. See
`src/primitives/topbar/README.md`.

```tsx
import { Topbar } from "@ds/core";
<Topbar>
  <Topbar.Logo />
  <Topbar.Nav>{links}</Topbar.Nav>
  <Topbar.Actions>{user}</Topbar.Actions>
</Topbar>
```

### ContextMenu

Right-click menu, same item model as `Dropdown`. See `src/primitives/context-menu/README.md`.

```tsx
import { ContextMenu } from "@ds/core";
<ContextMenu>
  <ContextMenu.Trigger>Right-click here</ContextMenu.Trigger>
  <ContextMenu.Content>{items}</ContextMenu.Content>
</ContextMenu>
```

### Sheet

Full-height side panel, larger and less modal than `Drawer`. Used for settings, filters. See
`src/primitives/sheet/README.md`.

```tsx
import { Sheet } from "@ds/core";
<Sheet side="right" size="lg">
  <Sheet.Trigger>Open</Sheet.Trigger>
  <Sheet.Content>{form}</Sheet.Content>
</Sheet>
```

---

## Data (14)

Tabular, calendar, list, and status display. Owned by Agent G
(`src/primitives/{table,data-grid,calendar,date-picker,pagination,breadcrumb,kanban,timeline,activity-feed,empty-state,skeleton,loader,badge,avatar}/**`).

### Table

Lightweight semantic table. Compose with `Table.Head`, `Table.Body`, `Table.Row`, `Table.Cell`. See
`src/primitives/table/README.md`.

```tsx
import { Table } from "@ds/core";
<Table>
  <Table.Head><Table.Row>{cols}</Table.Row></Table.Head>
  <Table.Body>{rows.map(...)}</Table.Body>
</Table>
```

### DataGrid

Heavy table: sticky header, virtualized rows, column resize, sort, filter, row selection,
keyboard nav. Backed by TanStack Table internally. See `src/primitives/data-grid/README.md`.

```tsx
import { DataGrid } from "@ds/core";
<DataGrid data={rows} columns={cols} virtualized stickyHeader />
```

### Calendar

Month grid with single/range selection. Localized via Intl APIs. See
`src/primitives/calendar/README.md`.

```tsx
import { Calendar } from "@ds/core";
<Calendar mode="range" onSelect={setRange} />
```

### DatePicker

Calendar + input combo. Supports presets (`today`, `7d`, `30d`, custom). See
`src/primitives/date-picker/README.md`.

```tsx
import { DatePicker } from "@ds/core";
<DatePicker label="As-of date" presets={["7d","30d","ytd"]} />
```

### Pagination

Page list + prev/next + jump-to. Sizes `sm | md`. See `src/primitives/pagination/README.md`.

```tsx
import { Pagination } from "@ds/core";
<Pagination total={120} pageSize={20} page={page} onPageChange={setPage} />
```

### Breadcrumb

Truncated breadcrumb trail with collapse-overflow menu. See `src/primitives/breadcrumb/README.md`.

```tsx
import { Breadcrumb } from "@ds/core";
<Breadcrumb>
  <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
  <Breadcrumb.Item href="/vaults">Vaults</Breadcrumb.Item>
  <Breadcrumb.Item current>Hearst Yield</Breadcrumb.Item>
</Breadcrumb>
```

### Kanban

Column-based draggable board. Built on `@dnd-kit/core`. See `src/primitives/kanban/README.md`.

```tsx
import { Kanban } from "@ds/core";
<Kanban columns={cols} onCardMove={onMove} />
```

### Timeline

Vertical chronological list with custom node icons. See `src/primitives/timeline/README.md`.

```tsx
import { Timeline } from "@ds/core";
<Timeline>
  <Timeline.Item title="Deposit" timestamp={ts}>250k USDC</Timeline.Item>
</Timeline>
```

### ActivityFeed

Streaming list of recent events with grouped timestamps. See
`src/primitives/activity-feed/README.md`.

```tsx
import { ActivityFeed } from "@ds/core";
<ActivityFeed items={events} groupBy="day" />
```

### EmptyState

Placeholder for empty collections. Slots for icon, title, description, action. See
`src/primitives/empty-state/README.md`.

```tsx
import { EmptyState, Button } from "@ds/core";
<EmptyState
  icon={<Inbox />}
  title="No transactions yet"
  description="Your distributions will appear here."
  action={<Button>Get started</Button>}
/>
```

### Skeleton

Animated placeholder for loading content. Variants `text | circle | rectangle`. See
`src/primitives/skeleton/README.md`.

```tsx
import { Skeleton } from "@ds/core";
<Skeleton variant="text" lines={3} />
```

### Loader

Spinner / progress indicator. Variants `spinner | dots | bar`, sizes `sm | md | lg`. See
`src/primitives/loader/README.md`.

```tsx
import { Loader } from "@ds/core";
<Loader variant="spinner" size="md" label="Loading vault…" />
```

### Badge

Inline pill for status, count, label. Variants paired with status tokens. See
`src/primitives/badge/README.md`.

```tsx
import { Badge } from "@ds/core";
<Badge variant="success">Live</Badge>
<Badge variant="warning">Stale</Badge>
```

### Avatar

User avatar with fallback initials, status dot, sizes `xs | sm | md | lg | xl`. See
`src/primitives/avatar/README.md`.

```tsx
import { Avatar } from "@ds/core";
<Avatar src={user.image} name={user.name} size="md" status="online" />
```

---

## AI-SaaS Specials (9)

Workflows characteristic of modern AI / data tools. Owned by Agent H
(`src/primitives/{command-palette,ai-prompt-box,chat-ui,kpi-widget,chart,terminal,notification-center,spotlight-search,file-upload}/**`).

### CommandPalette

`Cmd+K` palette à la Linear / Raycast. Fuzzy search, scoped sections, recents, custom render
items. See `src/primitives/command-palette/README.md`.

```tsx
import { CommandPalette } from "@ds/core";
<CommandPalette open={open} onOpenChange={setOpen} items={commands} />
```

### AIPromptBox

Multi-line prompt with model selector, attachment slot, send button, and slash-command menu.
Forbids AI chat outputs unstructured per project rule — pass `mode="structured"`. See
`src/primitives/ai-prompt-box/README.md`.

```tsx
import { AIPromptBox } from "@ds/core";
<AIPromptBox model="kimi-k2.6" onSubmit={onPrompt} placeholder="Ask the engine…" />
```

### ChatUI

Threaded chat surface. Streams tokens, supports tool-call rendering, system messages, citations.
See `src/primitives/chat-ui/README.md`.

```tsx
import { ChatUI } from "@ds/core";
<ChatUI messages={messages} streaming={streaming} onSend={onSend} />
```

### KpiWidget

KPI card: value + label + delta + spark + provenance badge. Reads `--ds-font-mono` for tabular
nums. See `src/primitives/kpi-widget/README.md`.

```tsx
import { KpiWidget } from "@ds/core";
<KpiWidget
  label="Cumulative yield"
  value="$1.24M"
  delta={{ value: 4.2, direction: "up" }}
  provenance="Attested"
/>
```

### Chart

Wrapper over a charting layer with token-driven palette, sparkline / line / area / bar / candle
variants. SVG-only, no canvas, AAA-readable on all themes. See `src/primitives/chart/README.md`.

```tsx
import { Chart } from "@ds/core";
<Chart kind="area" data={series} xKey="ts" yKey="apy" />
```

### Terminal

Read-only terminal output (logs, build, deploy). Mono font, color-coded lines, copy-on-click. See
`src/primitives/terminal/README.md`.

```tsx
import { Terminal } from "@ds/core";
<Terminal lines={logLines} autoScroll />
```

### NotificationCenter

Inbox tray attached to a topbar bell. Grouped, read/unread, mark-all. See
`src/primitives/notification-center/README.md`.

```tsx
import { NotificationCenter } from "@ds/core";
<NotificationCenter items={notifs} onMarkAllRead={ack} />
```

### SpotlightSearch

Global app search bar with section results (pages, people, docs). See
`src/primitives/spotlight-search/README.md`.

```tsx
import { SpotlightSearch } from "@ds/core";
<SpotlightSearch onSearch={fetchResults} sections={sections} />
```

### FileUpload

Drag-and-drop or click-to-select uploader. Per-file progress, validation, retry. See
`src/primitives/file-upload/README.md`.

```tsx
import { FileUpload } from "@ds/core";
<FileUpload accept="application/pdf" maxSize="10MB" onUpload={onUpload} multiple />
```

---

## Summary

| Category | Count |
|---|---|
| Form | 10 |
| Layout | 12 |
| Data | 14 |
| AI-SaaS | 9 |
| **Total** | **45** |

### Cross-cutting contracts

Every primitive in this catalog:

- Accepts a `className` merged via `cn()` (see `src/utils/cn.ts`).
- Forwards `ref` to its root DOM element.
- Has `variant`, `size`, `disabled`, `loading` props where applicable.
- Reads tokens through `var(--ds-*)`; never hardcodes.
- Renders correctly across all 8 themes — verified in the visual regression suite.
- Honors `prefers-reduced-motion`.
- Hit-area floors at `var(--ds-spacing-11)` (44px).

See `CONTRACT.md §3` for the full contract.
