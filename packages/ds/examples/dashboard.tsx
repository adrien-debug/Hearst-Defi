/**
 * Operations Dashboard — example app for @ds/core
 *
 * Theme: dark (default for ops surfaces — eyes-on-screen, long sessions, parity with
 * Linear admin / Stripe dashboard). Themed via `data-ds-theme="dark"` on the root.
 *
 * Requires DS components from agents E (Button, Input, Avatar buttons), F (Card, Sidebar,
 * Topbar, Tabs, Dropdown), G (Table, Pagination, Badge, Avatar, ActivityFeed, Breadcrumb),
 * H (KpiWidget, LineChart, BarChart). Run `pnpm typecheck` after all agents are done.
 *
 * Zero hardcoded design values: every color/spacing/radius/shadow/typography unit
 * resolves through `var(--ds-*)` tokens exposed by `@ds/core/tokens`.
 */

import * as React from "react";

import { Avatar } from "@ds/core/primitives/avatar";
import { Badge } from "@ds/core/primitives/badge";
import { BarChart } from "@ds/core/primitives/chart";
import { Breadcrumb } from "@ds/core/primitives/breadcrumb";
import { Button } from "@ds/core/primitives/button";
import { Card } from "@ds/core/primitives/card";
import { Dropdown } from "@ds/core/primitives/dropdown";
import { Input } from "@ds/core/primitives/input";
import { KpiWidget } from "@ds/core/primitives/kpi-widget";
import { LineChart } from "@ds/core/primitives/chart";
import { Pagination } from "@ds/core/primitives/pagination";
import { Sidebar } from "@ds/core/primitives/sidebar";
import { Table } from "@ds/core/primitives/table";
import { Topbar } from "@ds/core/primitives/topbar";
import { ActivityFeed } from "@ds/core/primitives/activity-feed";

/* ─────────────────────────────────────────────────────────────────────────────
 * Mock data — realistic, inline. No fetch, no DB, 100% static.
 * ─────────────────────────────────────────────────────────────────────────── */

type KpiPoint = { x: number; y: number };
type Kpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  sparkline: KpiPoint[];
};

const KPI_DATA: Kpi[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$148,420",
    delta: "+12.4% vs last month",
    trend: "up",
    sparkline: [
      { x: 0, y: 92 }, { x: 1, y: 95 }, { x: 2, y: 90 }, { x: 3, y: 102 },
      { x: 4, y: 110 }, { x: 5, y: 108 }, { x: 6, y: 118 }, { x: 7, y: 124 },
      { x: 8, y: 121 }, { x: 9, y: 132 }, { x: 10, y: 138 }, { x: 11, y: 148 },
    ],
  },
  {
    id: "active",
    label: "Active users",
    value: "24,318",
    delta: "+3.2% vs last week",
    trend: "up",
    sparkline: [
      { x: 0, y: 200 }, { x: 1, y: 205 }, { x: 2, y: 210 }, { x: 3, y: 208 },
      { x: 4, y: 215 }, { x: 5, y: 222 }, { x: 6, y: 228 }, { x: 7, y: 232 },
      { x: 8, y: 238 }, { x: 9, y: 241 }, { x: 10, y: 240 }, { x: 11, y: 243 },
    ],
  },
  {
    id: "conversion",
    label: "Conversion rate",
    value: "3.8%",
    delta: "+0.4 pts vs last month",
    trend: "up",
    sparkline: [
      { x: 0, y: 30 }, { x: 1, y: 31 }, { x: 2, y: 29 }, { x: 3, y: 32 },
      { x: 4, y: 33 }, { x: 5, y: 31 }, { x: 6, y: 34 }, { x: 7, y: 35 },
      { x: 8, y: 36 }, { x: 9, y: 37 }, { x: 10, y: 38 }, { x: 11, y: 38 },
    ],
  },
  {
    id: "churn",
    label: "Churn",
    value: "1.9%",
    delta: "-0.3 pts vs last month",
    trend: "down",
    sparkline: [
      { x: 0, y: 28 }, { x: 1, y: 27 }, { x: 2, y: 26 }, { x: 3, y: 25 },
      { x: 4, y: 24 }, { x: 5, y: 24 }, { x: 6, y: 23 }, { x: 7, y: 22 },
      { x: 8, y: 21 }, { x: 9, y: 20 }, { x: 10, y: 20 }, { x: 11, y: 19 },
    ],
  },
];

const REVENUE_30D: KpiPoint[] = Array.from({ length: 30 }, (_, i) => ({
  x: i,
  y: 3800 + Math.round(420 * Math.sin(i / 4)) + i * 38,
}));

const USERS_BY_PLAN = [
  { plan: "Free", value: 14820 },
  { plan: "Starter", value: 6240 },
  { plan: "Pro", value: 2830 },
  { plan: "Business", value: 318 },
  { plan: "Enterprise", value: 110 },
];

type TxStatus = "settled" | "pending" | "refunded" | "failed";
type Tx = {
  id: string;
  customer: string;
  email: string;
  amount: string;
  status: TxStatus;
  method: string;
  date: string;
};

const TX_DATA: Tx[] = [
  { id: "tx_01HM7Z3", customer: "Adeline Park",   email: "adeline@northwind.io",   amount: "$2,480.00", status: "settled",  method: "Visa •• 4242", date: "May 26, 14:08" },
  { id: "tx_01HM7Z4", customer: "Mateo Ferrari",  email: "mateo@helix.studio",      amount: "$148.50",   status: "settled",  method: "ACH",           date: "May 26, 13:51" },
  { id: "tx_01HM7Z5", customer: "Sara Olusegun",  email: "sara@ridgehouse.co",      amount: "$890.00",   status: "pending",  method: "Wire",          date: "May 26, 13:22" },
  { id: "tx_01HM7Z6", customer: "Jonas Lehmann",  email: "jonas@kontur.de",         amount: "$1,200.00", status: "settled",  method: "Mastercard •• 0019", date: "May 26, 12:47" },
  { id: "tx_01HM7Z7", customer: "Priya Iyer",     email: "priya@longshore.co",      amount: "$320.00",   status: "refunded", method: "Visa •• 1331",  date: "May 26, 12:10" },
  { id: "tx_01HM7Z8", customer: "Théo Marchand",  email: "theo@arcadia.fr",         amount: "$2,100.00", status: "settled",  method: "ACH",           date: "May 26, 11:42" },
  { id: "tx_01HM7Z9", customer: "Hana Kim",       email: "hana@northpath.com",      amount: "$74.00",    status: "failed",   method: "Visa •• 7720",  date: "May 26, 11:05" },
  { id: "tx_01HM7ZA", customer: "Lucas Pereira",  email: "lucas@vela.engineering",  amount: "$540.00",   status: "settled",  method: "Mastercard •• 8901", date: "May 26, 10:33" },
  { id: "tx_01HM7ZB", customer: "Imogen Hart",    email: "imogen@halberd.studio",   amount: "$3,180.00", status: "settled",  method: "Wire",          date: "May 26, 09:58" },
  { id: "tx_01HM7ZC", customer: "Cyrille Aubry",  email: "cyrille@maquette.io",     amount: "$212.40",   status: "pending",  method: "Visa •• 0044",  date: "May 26, 09:24" },
];

const STATUS_TONE: Record<TxStatus, "success" | "warning" | "info" | "danger"> = {
  settled: "success",
  pending: "warning",
  refunded: "info",
  failed: "danger",
};

type ActivityEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  icon?: "user-plus" | "credit-card" | "shield" | "refresh";
};

const ACTIVITY: ActivityEvent[] = [
  { id: "ev1", actor: "Adeline Park",    action: "started a Pro subscription",         target: "$240/mo",     timestamp: "2 min ago",  icon: "credit-card" },
  { id: "ev2", actor: "System",          action: "rotated API key",                    target: "live_key_7f", timestamp: "18 min ago", icon: "shield" },
  { id: "ev3", actor: "Hana Kim",        action: "payment declined",                   target: "tx_01HM7Z9",  timestamp: "27 min ago", icon: "refresh" },
  { id: "ev4", actor: "Mateo Ferrari",   action: "invited a teammate",                 target: "alex@helix.studio", timestamp: "41 min ago", icon: "user-plus" },
];

const NAV_ITEMS = [
  { id: "home",        label: "Overview",     icon: "home",         active: true },
  { id: "txn",         label: "Transactions", icon: "credit-card",  active: false },
  { id: "customers",   label: "Customers",    icon: "users",        active: false },
  { id: "products",    label: "Products",     icon: "package",      active: false },
  { id: "reports",     label: "Reports",      icon: "bar-chart",    active: false },
  { id: "settings",    label: "Settings",     icon: "settings",     active: false },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * Example app
 * ─────────────────────────────────────────────────────────────────────────── */

export default function OperationsDashboardExample() {
  const [page, setPage] = React.useState(1);

  return (
    <div
      data-ds-theme="dark"
      className="
        ds-theme-dark
        flex h-screen w-full
        bg-[color:var(--ds-color-surface-base)]
        text-[color:var(--ds-color-text-primary)]
        font-[family-name:var(--ds-font-family-sans)]
        antialiased
      "
    >
      {/* ── Sidebar (left, fixed) ─────────────────────────────────────────── */}
      <Sidebar
        density="comfortable"
        width="md"
        className="
          shrink-0 border-r
          border-[color:var(--ds-color-border-subtle)]
          bg-[color:var(--ds-color-surface-elevated)]
        "
      >
        <Sidebar.Header>
          <div className="flex items-center gap-[var(--ds-spacing-2)] px-[var(--ds-spacing-3)] py-[var(--ds-spacing-4)]">
            <div
              aria-hidden
              className="
                h-[var(--ds-spacing-8)] w-[var(--ds-spacing-8)]
                rounded-[var(--ds-radius-md)]
                bg-[color:var(--ds-color-accent-500)]
              "
            />
            <span className="text-[length:var(--ds-font-size-heading-sm)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
              Northwind
            </span>
          </div>
        </Sidebar.Header>

        <Sidebar.Nav aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Sidebar.NavItem
              key={item.id}
              icon={item.icon}
              active={item.active}
              href={`#${item.id}`}
            >
              {item.label}
            </Sidebar.NavItem>
          ))}
        </Sidebar.Nav>

        <Sidebar.Footer>
          <div className="flex items-center gap-[var(--ds-spacing-3)] px-[var(--ds-spacing-3)] py-[var(--ds-spacing-3)]">
            <Avatar src="/avatars/owner.jpg" alt="Owner" fallback="OP" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-medium)]">
                Olivia Park
              </p>
              <p className="truncate text-[length:var(--ds-font-size-body-xs)] text-[color:var(--ds-color-text-secondary)]">
                Workspace owner
              </p>
            </div>
          </div>
        </Sidebar.Footer>
      </Sidebar>

      {/* ── Right column : Topbar + Main ──────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          className="
            sticky top-0 z-[var(--ds-z-sticky)]
            border-b border-[color:var(--ds-color-border-subtle)]
            bg-[color:var(--ds-color-surface-base)]
            backdrop-blur-[var(--ds-blur-md)]
          "
        >
          <Topbar.Leading>
            <Breadcrumb aria-label="Breadcrumb">
              <Breadcrumb.Item href="#">Workspace</Breadcrumb.Item>
              <Breadcrumb.Item href="#">Northwind</Breadcrumb.Item>
              <Breadcrumb.Item current>Overview</Breadcrumb.Item>
            </Breadcrumb>
          </Topbar.Leading>

          <Topbar.Center>
            <Input
              type="search"
              placeholder="Search transactions, customers, invoices…"
              size="md"
              leadingIcon="search"
              aria-label="Search"
              className="w-[clamp(16rem,40vw,32rem)]"
            />
          </Topbar.Center>

          <Topbar.Trailing>
            <Button variant="ghost" size="sm" iconOnly aria-label="Notifications" icon="bell">
              <Badge tone="accent" size="xs" dot aria-label="3 unread" />
            </Button>
            <Dropdown>
              <Dropdown.Trigger asChild>
                <Button variant="ghost" size="sm" aria-label="Account menu">
                  <Avatar src="/avatars/owner.jpg" alt="" fallback="OP" size="xs" />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Content align="end">
                <Dropdown.Label>olivia@northwind.io</Dropdown.Label>
                <Dropdown.Separator />
                <Dropdown.Item>Profile</Dropdown.Item>
                <Dropdown.Item>Workspace settings</Dropdown.Item>
                <Dropdown.Item>Billing</Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item variant="danger">Sign out</Dropdown.Item>
              </Dropdown.Content>
            </Dropdown>
          </Topbar.Trailing>
        </Topbar>

        <main
          className="
            flex-1 overflow-y-auto
            px-[var(--ds-spacing-8)] py-[var(--ds-spacing-8)]
            ds-animate-fade-in
          "
        >
          {/* Page header */}
          <header className="mb-[var(--ds-spacing-7)] flex items-end justify-between gap-[var(--ds-spacing-4)]">
            <div>
              <h1 className="text-[length:var(--ds-font-size-display-sm)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
                Overview
              </h1>
              <p className="mt-[var(--ds-spacing-2)] text-[length:var(--ds-font-size-body-md)] text-[color:var(--ds-color-text-secondary)]">
                Last 30 days · all currencies converted to USD
              </p>
            </div>
            <div className="flex items-center gap-[var(--ds-spacing-2)]">
              <Button variant="ghost" size="md" icon="calendar">Last 30 days</Button>
              <Button variant="secondary" size="md" icon="download">Export</Button>
              <Button variant="primary" size="md" icon="plus">New invoice</Button>
            </div>
          </header>

          {/* Hero row : 4 KPI widgets */}
          <section
            aria-label="Key metrics"
            className="
              grid gap-[var(--ds-spacing-4)]
              grid-cols-1 sm:grid-cols-2 xl:grid-cols-4
              mb-[var(--ds-spacing-7)]
            "
          >
            {KPI_DATA.map((k) => (
              <KpiWidget
                key={k.id}
                label={k.label}
                value={k.value}
                delta={k.delta}
                trend={k.trend}
                sparkline={k.sparkline}
                density="comfortable"
                className="ds-animate-fade-in"
              />
            ))}
          </section>

          {/* Charts row */}
          <section
            aria-label="Trends"
            className="
              grid gap-[var(--ds-spacing-4)]
              grid-cols-1 lg:grid-cols-3
              mb-[var(--ds-spacing-7)]
            "
          >
            <Card className="lg:col-span-2" padding="lg">
              <Card.Header>
                <Card.Title>Revenue · 30 days</Card.Title>
                <Card.Description>USD, gross, refunds excluded</Card.Description>
              </Card.Header>
              <Card.Body>
                <LineChart
                  data={REVENUE_30D}
                  xKey="x"
                  yKey="y"
                  height={280}
                  showGrid
                  smooth
                  aria-label="Revenue over the last 30 days"
                />
              </Card.Body>
            </Card>

            <Card padding="lg">
              <Card.Header>
                <Card.Title>Users by plan</Card.Title>
                <Card.Description>Distribution across active tiers</Card.Description>
              </Card.Header>
              <Card.Body>
                <BarChart
                  data={USERS_BY_PLAN}
                  xKey="plan"
                  yKey="value"
                  height={280}
                  aria-label="Active users grouped by subscription plan"
                />
              </Card.Body>
            </Card>
          </section>

          {/* Bottom row : Table (2/3) + ActivityFeed (1/3) */}
          <section
            aria-label="Activity"
            className="
              grid gap-[var(--ds-spacing-4)]
              grid-cols-1 lg:grid-cols-3
            "
          >
            <Card className="lg:col-span-2" padding="lg">
              <Card.Header>
                <div className="flex items-center justify-between gap-[var(--ds-spacing-4)]">
                  <div>
                    <Card.Title>Recent transactions</Card.Title>
                    <Card.Description>Latest 10 across all merchants</Card.Description>
                  </div>
                  <Button variant="ghost" size="sm" icon="filter">Filter</Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Table aria-label="Recent transactions" density="comfortable">
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell sortable>Customer</Table.HeaderCell>
                      <Table.HeaderCell sortable align="right">Amount</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                      <Table.HeaderCell>Method</Table.HeaderCell>
                      <Table.HeaderCell sortable align="right">Date</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {TX_DATA.map((tx) => (
                      <Table.Row key={tx.id} interactive>
                        <Table.Cell>
                          <div className="flex items-center gap-[var(--ds-spacing-3)]">
                            <Avatar fallback={tx.customer.split(" ").map((n) => n[0]).join("").slice(0, 2)} size="xs" />
                            <div className="min-w-0">
                              <p className="truncate text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-medium)]">
                                {tx.customer}
                              </p>
                              <p className="truncate text-[length:var(--ds-font-size-body-xs)] text-[color:var(--ds-color-text-secondary)]">
                                {tx.email}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell align="right">
                          <span className="font-[family-name:var(--ds-font-family-mono)] tabular-nums">
                            {tx.amount}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge tone={STATUS_TONE[tx.status]} variant="soft" size="sm">
                            {tx.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-secondary)]">
                            {tx.method}
                          </span>
                        </Table.Cell>
                        <Table.Cell align="right">
                          <span className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-secondary)]">
                            {tx.date}
                          </span>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Card.Body>
              <Card.Footer className="flex items-center justify-between">
                <span className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-secondary)]">
                  Showing 10 of 28 transactions
                </span>
                <Pagination
                  currentPage={page}
                  totalPages={3}
                  onPageChange={setPage}
                  aria-label="Transactions pagination"
                />
              </Card.Footer>
            </Card>

            <Card padding="lg">
              <Card.Header>
                <Card.Title>Activity feed</Card.Title>
                <Card.Description>Last 4 workspace events</Card.Description>
              </Card.Header>
              <Card.Body>
                <ActivityFeed aria-label="Recent activity">
                  {ACTIVITY.map((ev) => (
                    <ActivityFeed.Item
                      key={ev.id}
                      icon={ev.icon}
                      title={`${ev.actor} ${ev.action}`}
                      meta={ev.target}
                      timestamp={ev.timestamp}
                    />
                  ))}
                </ActivityFeed>
              </Card.Body>
              <Card.Footer>
                <Button variant="ghost" size="sm" className="w-full">
                  See full audit log
                </Button>
              </Card.Footer>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
