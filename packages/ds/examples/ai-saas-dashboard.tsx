/**
 * AI SaaS Dashboard — example app for @ds/core
 *
 * Theme: `luxury` (deep charcoal + restrained gold accent) is chosen over `neon` because:
 *  1. Long-form reading of model output benefits from low-contrast chrome and high-contrast
 *     text — luxury hits AAA on body copy while staying visually distinctive.
 *  2. Anthropic / OpenAI / Mistral playgrounds all converge on near-black hulls with a
 *     single warm accent. Luxury matches that "premium tooling" feel without competing
 *     with the conversation content.
 *  3. Neon's saturated magenta/cyan would fight the syntax-highlighted code blocks in
 *     assistant replies — luxury's gold sits in a hue range that no code theme uses.
 *
 * Requires DS components from agents E (Button, Input, Textarea, Switch, Slider, Select),
 * F (Sidebar, Tabs, Tooltip, Card), G (Avatar, Badge, Skeleton), H (ChatUI, AiPromptBox,
 * FileUpload). Run `pnpm typecheck` after all agents are done.
 */

"use client";

import * as React from "react";

import { Avatar } from "@ds/core/primitives/avatar";
import { Badge } from "@ds/core/primitives/badge";
import { Button } from "@ds/core/primitives/button";
import { Card } from "@ds/core/primitives/card";
import { Sidebar } from "@ds/core/primitives/sidebar";
import { Slider } from "@ds/core/primitives/slider";
import { Switch } from "@ds/core/primitives/switch";
import { Tabs } from "@ds/core/primitives/tabs";
import { Tooltip } from "@ds/core/primitives/tooltip";
import { Select } from "@ds/core/primitives/select";
import { ChatUi } from "@ds/core/primitives/chat-ui";
import { AiPromptBox } from "@ds/core/primitives/ai-prompt-box";
import { FileUpload } from "@ds/core/primitives/file-upload";

/* ─────────────────────────────────────────────────────────────────────────────
 * Mock data
 * ─────────────────────────────────────────────────────────────────────────── */

type ChatHistoryItem = {
  id: string;
  title: string;
  updatedAt: string;
  active?: boolean;
};

const CHAT_HISTORY: ChatHistoryItem[] = [
  { id: "c1", title: "Refactor billing service to event-sourced",          updatedAt: "Just now", active: true },
  { id: "c2", title: "Explain B-tree rebalancing for engineers",            updatedAt: "27 min" },
  { id: "c3", title: "Draft RFC: tenant-scoped feature flags",              updatedAt: "1 h" },
  { id: "c4", title: "Code review — payments retry queue",                  updatedAt: "2 h" },
  { id: "c5", title: "Translate API docs into French (technical register)", updatedAt: "Yesterday" },
  { id: "c6", title: "Compare Postgres LISTEN/NOTIFY vs Redis streams",     updatedAt: "Yesterday" },
  { id: "c7", title: "Onboarding email sequence — 5 touch points",          updatedAt: "2 d" },
  { id: "c8", title: "Spec a webhook signing scheme",                       updatedAt: "3 d" },
];

type ChatRole = "user" | "assistant" | "system";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  streaming?: boolean;
  actions?: Array<"copy" | "retry" | "thumb-up" | "thumb-down">;
};

const CONVERSATION: ChatMessage[] = [
  {
    id: "m1",
    role: "system",
    content: "You are paired with Claude Opus 4.7. Conversation is scoped to project northwind-payments.",
  },
  {
    id: "m2",
    role: "user",
    content:
      "We want to refactor our billing service to be event-sourced. Current design is CRUD on Postgres with audit triggers. What are the three biggest risks I should plan for before writing a single line?",
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "Three risks worth pricing into the plan before any code lands:\n\n" +
      "1. Schema-evolution drift. Events are immutable, so v1 mistakes follow you forever. Decide on an upcaster pattern and a versioning scheme (e.g., `BillingChargeCreated.v2`) on day one.\n" +
      "2. Read-model rebuild cost. At your transaction volume a full projection rebuild may take hours. Budget for snapshotting and partition-by-tenant projections from the start.\n" +
      "3. Operational debugging. CRUD lets engineers `SELECT *`; event sourcing forces them to learn the projection. Invest early in a UI that shows the event stream + derived state side by side — otherwise on-call quality drops for a quarter.",
    actions: ["copy", "retry", "thumb-up", "thumb-down"],
  },
  {
    id: "m4",
    role: "user",
    content: "Great. Can you sketch the upcaster pattern in TypeScript?",
  },
  {
    id: "m5",
    role: "assistant",
    streaming: true,
    content:
      "Sure — here's a minimal shape that keeps the rest of the system free of version branching:\n\n```ts\ntype EventEnvelope<T = unknown> = { type: string; version: number; payload: T };\n\ntype Upcaster<TIn, TOut> = {\n  from: { type: string; version: number };\n  to:   { type: string; version: number };\n  upcast: (e: EventEnvelope<TIn>) => EventEnvelope<TOut>;\n};\n\nexport function applyUpcasters(\n  event: EventEnvelope,\n  upcasters: Upcaster<any, any>[],\n): EventEnvelope {\n  let current = event;\n  let progressed = true;\n  while (progressed) {\n    progressed = false;\n    for (const u of upcasters) {\n      if (u.from.type === current.type && u.from.version === current.version) {\n        current = u.upcast(current);\n        progressed = true;\n        break;\n      }\n    }\n  }\n  return current;\n}\n```\n\nProjections only ever see the latest version. Continuing…",
    actions: ["copy", "retry"],
  },
];

const PROMPT_SUGGESTIONS = [
  "Write the unit tests for the upcaster",
  "Generate a migration plan from CRUD to event-sourced",
  "Explain trade-offs vs CDC (Debezium)",
  "Draft the RFC headline + 3 bullet summary",
];

/* ─────────────────────────────────────────────────────────────────────────────
 * Example app
 * ─────────────────────────────────────────────────────────────────────────── */

export default function AiSaasDashboardExample() {
  const [temperature, setTemperature] = React.useState(0.6);
  const [maxTokens, setMaxTokens] = React.useState(4096);
  const [streamingOn, setStreamingOn] = React.useState(true);
  const [toolsOn, setToolsOn] = React.useState(true);
  const [memoryOn, setMemoryOn] = React.useState(false);
  const [model, setModel] = React.useState("claude-opus-4-7");
  const [draft, setDraft] = React.useState("");

  return (
    <div
      data-ds-theme="luxury"
      className="
        ds-theme-luxury
        grid h-screen w-full
        grid-cols-[18rem_1fr_22rem]
        bg-[color:var(--ds-color-surface-base)]
        text-[color:var(--ds-color-text-primary)]
        font-[family-name:var(--ds-font-family-sans)]
        antialiased
      "
    >
      {/* ── Left sidebar : chat history ──────────────────────────────────── */}
      <Sidebar
        density="comfortable"
        className="
          border-r border-[color:var(--ds-color-border-subtle)]
          bg-[color:var(--ds-color-surface-elevated)]
        "
      >
        <Sidebar.Header className="px-[var(--ds-spacing-4)] py-[var(--ds-spacing-4)]">
          <div className="flex items-center justify-between gap-[var(--ds-spacing-3)]">
            <div className="flex items-center gap-[var(--ds-spacing-2)]">
              <div
                aria-hidden
                className="
                  h-[var(--ds-spacing-7)] w-[var(--ds-spacing-7)]
                  rounded-[var(--ds-radius-md)]
                  bg-[color:var(--ds-color-accent-500)]
                "
              />
              <span className="text-[length:var(--ds-font-size-heading-sm)] font-[weight:var(--ds-font-weight-semibold)]">
                Atelier
              </span>
            </div>
            <Badge tone="accent" variant="soft" size="xs">Pro</Badge>
          </div>

          <Button
            variant="primary"
            size="md"
            icon="plus"
            className="mt-[var(--ds-spacing-4)] w-full"
          >
            New conversation
          </Button>
        </Sidebar.Header>

        <Sidebar.Section title="Today">
          {CHAT_HISTORY.slice(0, 4).map((c) => (
            <Sidebar.NavItem
              key={c.id}
              active={c.active}
              icon="message-square"
              meta={c.updatedAt}
              href={`#chat-${c.id}`}
            >
              <span className="truncate">{c.title}</span>
            </Sidebar.NavItem>
          ))}
        </Sidebar.Section>

        <Sidebar.Section title="Earlier">
          {CHAT_HISTORY.slice(4).map((c) => (
            <Sidebar.NavItem
              key={c.id}
              icon="message-square"
              meta={c.updatedAt}
              href={`#chat-${c.id}`}
            >
              <span className="truncate">{c.title}</span>
            </Sidebar.NavItem>
          ))}
        </Sidebar.Section>

        <Sidebar.Footer>
          <div className="flex items-center gap-[var(--ds-spacing-3)] px-[var(--ds-spacing-3)] py-[var(--ds-spacing-3)]">
            <Avatar fallback="OP" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-medium)]">
                Olivia Park
              </p>
              <p className="truncate text-[length:var(--ds-font-size-body-xs)] text-[color:var(--ds-color-text-secondary)]">
                42% of monthly quota
              </p>
            </div>
          </div>
        </Sidebar.Footer>
      </Sidebar>

      {/* ── Main : conversation ──────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col">
        <header
          className="
            flex items-center justify-between gap-[var(--ds-spacing-4)]
            border-b border-[color:var(--ds-color-border-subtle)]
            bg-[color:var(--ds-color-surface-base)]/[var(--ds-opacity-80)]
            px-[var(--ds-spacing-6)] py-[var(--ds-spacing-4)]
            backdrop-blur-[var(--ds-blur-md)]
          "
        >
          <div className="flex min-w-0 items-center gap-[var(--ds-spacing-3)]">
            <h1 className="truncate text-[length:var(--ds-font-size-heading-md)] font-[weight:var(--ds-font-weight-semibold)]">
              Refactor billing service to event-sourced
            </h1>
            <Badge tone="accent" variant="soft" size="sm" icon="sparkles">
              Claude Opus 4.7
            </Badge>
            <Badge tone="neutral" variant="outline" size="sm">
              northwind-payments
            </Badge>
          </div>

          <div className="flex items-center gap-[var(--ds-spacing-2)]">
            <Tooltip content="Share conversation">
              <Button variant="ghost" size="sm" iconOnly icon="share" aria-label="Share" />
            </Tooltip>
            <Tooltip content="Export as Markdown">
              <Button variant="ghost" size="sm" iconOnly icon="download" aria-label="Export" />
            </Tooltip>
            <Tooltip content="Conversation settings">
              <Button variant="ghost" size="sm" iconOnly icon="settings" aria-label="Settings" />
            </Tooltip>
          </div>
        </header>

        <ChatUi
          className="flex-1 overflow-y-auto px-[var(--ds-spacing-6)] py-[var(--ds-spacing-6)]"
          aria-label="Conversation"
        >
          {CONVERSATION.map((msg) => (
            <ChatUi.Message
              key={msg.id}
              role={msg.role}
              streaming={msg.streaming}
              actions={msg.actions}
              avatar={
                msg.role === "assistant"
                  ? <Avatar fallback="C" size="sm" tone="accent" />
                  : msg.role === "user"
                    ? <Avatar fallback="OP" size="sm" />
                    : undefined
              }
            >
              {msg.content}
            </ChatUi.Message>
          ))}
        </ChatUi>

        <div
          className="
            border-t border-[color:var(--ds-color-border-subtle)]
            bg-[color:var(--ds-color-surface-base)]
            px-[var(--ds-spacing-6)] pb-[var(--ds-spacing-6)] pt-[var(--ds-spacing-4)]
          "
        >
          <AiPromptBox
            value={draft}
            onValueChange={setDraft}
            placeholder="Reply or @-mention a file…"
            suggestions={PROMPT_SUGGESTIONS}
            onSuggestionSelect={(s) => setDraft(s)}
            counter={{ used: draft.length, max: 8000 }}
            attachments={[{ kind: "image" }, { kind: "file" }]}
            submitLabel="Send"
            aria-label="Compose message"
          />
        </div>
      </section>

      {/* ── Right sidebar : settings ─────────────────────────────────────── */}
      <aside
        aria-label="Conversation settings"
        className="
          border-l border-[color:var(--ds-color-border-subtle)]
          bg-[color:var(--ds-color-surface-elevated)]
          overflow-y-auto
        "
      >
        <Tabs defaultValue="model" className="flex h-full flex-col">
          <Tabs.List
            aria-label="Settings"
            className="
              sticky top-0 z-[var(--ds-z-sticky)]
              border-b border-[color:var(--ds-color-border-subtle)]
              bg-[color:var(--ds-color-surface-elevated)]
              px-[var(--ds-spacing-4)] py-[var(--ds-spacing-2)]
            "
          >
            <Tabs.Trigger value="model">Model</Tabs.Trigger>
            <Tabs.Trigger value="tools">Tools</Tabs.Trigger>
            <Tabs.Trigger value="memory">Memory</Tabs.Trigger>
          </Tabs.List>

          {/* — Model tab — */}
          <Tabs.Content value="model" className="flex flex-col gap-[var(--ds-spacing-5)] p-[var(--ds-spacing-5)]">
            <Card padding="md">
              <Card.Header>
                <Card.Title>Model</Card.Title>
                <Card.Description>Pinned to Opus 4.7 for this workspace</Card.Description>
              </Card.Header>
              <Card.Body>
                <Select value={model} onValueChange={setModel} aria-label="Model">
                  <Select.Item value="claude-opus-4-7">Claude Opus 4.7</Select.Item>
                  <Select.Item value="claude-sonnet-4-7">Claude Sonnet 4.7</Select.Item>
                  <Select.Item value="claude-haiku-4-5">Claude Haiku 4.5</Select.Item>
                </Select>
              </Card.Body>
            </Card>

            <Card padding="md">
              <Card.Header>
                <Card.Title>Sampling</Card.Title>
              </Card.Header>
              <Card.Body className="flex flex-col gap-[var(--ds-spacing-5)]">
                <Slider
                  label="Temperature"
                  description="Lower = deterministic. Higher = creative."
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v ?? 0)}
                  min={0}
                  max={1}
                  step={0.05}
                  valueLabel={temperature.toFixed(2)}
                />
                <Slider
                  label="Max tokens"
                  description="Hard cap on response length"
                  value={[maxTokens]}
                  onValueChange={([v]) => setMaxTokens(v ?? 0)}
                  min={256}
                  max={8192}
                  step={256}
                  valueLabel={maxTokens.toLocaleString("en-US")}
                />
                <div className="flex items-center justify-between gap-[var(--ds-spacing-4)]">
                  <div>
                    <p className="text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-medium)]">
                      Stream responses
                    </p>
                    <p className="text-[length:var(--ds-font-size-body-xs)] text-[color:var(--ds-color-text-secondary)]">
                      Show tokens as they arrive
                    </p>
                  </div>
                  <Switch
                    checked={streamingOn}
                    onCheckedChange={setStreamingOn}
                    aria-label="Stream responses"
                  />
                </div>
              </Card.Body>
            </Card>
          </Tabs.Content>

          {/* — Tools tab — */}
          <Tabs.Content value="tools" className="flex flex-col gap-[var(--ds-spacing-4)] p-[var(--ds-spacing-5)]">
            <Card padding="md">
              <Card.Header>
                <Card.Title>Tools</Card.Title>
                <Card.Description>Enable structured calls to your stack</Card.Description>
              </Card.Header>
              <Card.Body className="flex flex-col gap-[var(--ds-spacing-4)]">
                {[
                  { id: "web",       label: "Web search",     desc: "Fetch & summarize URLs" },
                  { id: "fs",        label: "Filesystem",     desc: "Read repo on read-only mount" },
                  { id: "exec",      label: "Code execution", desc: "Sandboxed Python + Node" },
                  { id: "db",        label: "Database",       desc: "Read-only Postgres replica" },
                ].map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between gap-[var(--ds-spacing-4)]">
                    <div>
                      <p className="text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-medium)]">
                        {t.label}
                      </p>
                      <p className="text-[length:var(--ds-font-size-body-xs)] text-[color:var(--ds-color-text-secondary)]">
                        {t.desc}
                      </p>
                    </div>
                    <Switch
                      defaultChecked={i < 2 && toolsOn}
                      onCheckedChange={() => setToolsOn((v) => !v)}
                      aria-label={t.label}
                    />
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Tabs.Content>

          {/* — Memory tab — */}
          <Tabs.Content value="memory" className="flex flex-col gap-[var(--ds-spacing-4)] p-[var(--ds-spacing-5)]">
            <Card padding="md">
              <Card.Header>
                <Card.Title>Conversation memory</Card.Title>
                <Card.Description>
                  Persist facts across conversations in this workspace
                </Card.Description>
              </Card.Header>
              <Card.Body className="flex flex-col gap-[var(--ds-spacing-4)]">
                <div className="flex items-center justify-between gap-[var(--ds-spacing-4)]">
                  <p className="text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-medium)]">
                    Enable memory
                  </p>
                  <Switch
                    checked={memoryOn}
                    onCheckedChange={setMemoryOn}
                    aria-label="Enable memory"
                  />
                </div>
              </Card.Body>
            </Card>

            <Card padding="md">
              <Card.Header>
                <Card.Title>Context files</Card.Title>
                <Card.Description>
                  Upload up to 25 MB of grounding documents for this conversation
                </Card.Description>
              </Card.Header>
              <Card.Body>
                <FileUpload
                  accept={[".md", ".pdf", ".txt", ".json", ".ts"]}
                  maxSize={25 * 1024 * 1024}
                  multiple
                  label="Drop files or click to upload"
                  helperText="Accepted: .md .pdf .txt .json .ts"
                  aria-label="Upload context files"
                />
              </Card.Body>
            </Card>
          </Tabs.Content>
        </Tabs>
      </aside>
    </div>
  );
}
