# CHANGELOG

All notable changes to `@ds/core` are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-26

### Added

- Initial release of `@ds/core`.
- **40+ primitives** across 4 domains:
  - Form (10) — `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`,
    `Switch`, `Slider`, `Combobox`.
  - Layout (12) — `Card`, `Modal`, `Drawer`, `Dropdown`, `Tabs`, `Tooltip`, `Popover`, `Toast`,
    `Sidebar`, `Topbar`, `ContextMenu`, `Sheet`.
  - Data (14) — `Table`, `DataGrid`, `Calendar`, `DatePicker`, `Pagination`, `Breadcrumb`,
    `Kanban`, `Timeline`, `ActivityFeed`, `EmptyState`, `Skeleton`, `Loader`, `Badge`, `Avatar`.
  - AI-SaaS (9) — `CommandPalette`, `AIPromptBox`, `ChatUI`, `KpiWidget`, `Chart`, `Terminal`,
    `NotificationCenter`, `SpotlightSearch`, `FileUpload`.
- **8 themes** — `light`, `dark`, `amoled`, `luxury`, `glass`, `enterprise`, `neon`, `monochrome`.
  Each theme is a CSS file in `src/themes/` that overrides only semantic and component tokens
  (never primitives).
- **White-label runtime** — `applyBrand`, `resetBrand`, `serializeBrand`, `parseBrand`, `getBrand`
  in `src/themes/white-label.ts`. Override colors, typography, radius, shadow, motion, density,
  icons, logo, and copy per tenant — SSR-safe, persistable to localStorage or cookie.
- **Tailwind v4 preset** at `@ds/core/tailwind/preset` — exposes every token as a utility under
  the `ds:` namespace.
- **3 example apps** under `examples/` — `dashboard.tsx`, `ai-saas-dashboard.tsx`, `landing.tsx`.
- **Figma variables JSON** (`tokens.figma.json`) — W3C Design Tokens Community Group format,
  ≈190 tokens, 8 modes for semantic colors.
- **Documentation** under `docs/` — `overview.md`, `tokens.md`, `themes.md`, `components.md`,
  `style-guide.md`, `white-label.md`, `a11y.md`, `migration.md`.
- **Accessibility floor** — WCAG 2.2 AA always, AAA on body text where feasible. Focus rings,
  keyboard navigation, screen-reader semantics, `prefers-reduced-motion`, forced-colors mode,
  touch targets ≥ 44×44px on every interactive primitive.
- **Motion engine** in `src/motion/` — token-backed transitions, reduced-motion override.
- **Token namespaces** — every CSS variable is `--ds-*` prefixed; no collision with Cockpit's
  `--ct-*`.

### Internal

- Build contract published as `CONTRACT.md` — non-negotiable for contributors.
- Agent file ownership matrix in `CONTRACT.md §8` covers Agents A through J.
- Per-component README, variants config, types, and test scaffolding established in
  `CONTRACT.md §4`.

[0.1.0]: https://example.com/changelog/0.1.0
