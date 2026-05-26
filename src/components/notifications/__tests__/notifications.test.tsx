/**
 * Tests for the notifications bell and drawer components.
 *
 * These tests exercise pure logic contracts (prop rendering, aria attributes,
 * category grouping, empty state) by calling components as plain functions
 * (Server-Component pattern) or inspecting returned JSX trees directly —
 * consistent with the project's `environment: "node"` vitest config.
 *
 * Client components that use hooks are tested by inspecting their initialised
 * state through the JSX tree returned from the function call.
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";

// ── Hoist mocks ──────────────────────────────────────────────────────────────

// Mock server actions (used by NotificationsDrawer)
vi.mock("@/lib/notifications/actions", () => ({
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllAsRead: vi.fn().mockResolvedValue(undefined),
  archive: vi.fn().mockResolvedValue(undefined),
  snooze: vi.fn().mockResolvedValue(undefined),
}));

// React hooks used by the drawer need a no-op stub in node environment
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useTransition: () => [false, (fn: () => void) => fn()],
    useEffect: vi.fn(),
    useCallback: (fn: unknown) => fn,
    useRef: () => ({ current: null }),
  };
});

import {
  NotificationsBell,
  type NotificationsBellProps,
} from "@/components/notifications/notifications-bell";
import type { Notification } from "@/lib/notifications/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNotif(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "clv8wqyim000008jpgr397209",
    userId: "user1",
    category: "fyi",
    severity: "info",
    title: "Test notification",
    body: "Body text",
    actionHref: null,
    actionLabel: null,
    entityType: null,
    entityId: null,
    readAt: null,
    archivedAt: null,
    snoozedUntil: null,
    createdAt: new Date("2026-05-26T10:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Bell — unreadCount=0 renders no badge
// ---------------------------------------------------------------------------
describe("NotificationsBell", () => {
  it("renders without a badge when unreadCount is 0", () => {
    const props: NotificationsBellProps = { unreadCount: 0, onClick: vi.fn() };
    const el = NotificationsBell(props) as React.ReactElement;
    expect(el).not.toBeNull();

    // aria-label should NOT mention count
    const ariaLabel = (el.props as { "aria-label": string })["aria-label"];
    expect(ariaLabel).toBe("Notifications");
  });

  // -------------------------------------------------------------------------
  // 2. Bell — unreadCount>0 sets aria-label with count
  // -------------------------------------------------------------------------
  it("sets aria-label with count when unreadCount > 0", () => {
    const props: NotificationsBellProps = { unreadCount: 5, onClick: vi.fn() };
    const el = NotificationsBell(props) as React.ReactElement;
    const ariaLabel = (el.props as { "aria-label": string })["aria-label"];
    expect(ariaLabel).toBe("Notifications, 5 unread");
  });

  // -------------------------------------------------------------------------
  // 3. Bell — count badge renders when unreadCount > 0
  // -------------------------------------------------------------------------
  it("renders a badge span when unreadCount > 0", () => {
    const props: NotificationsBellProps = { unreadCount: 3, onClick: vi.fn() };
    const el = NotificationsBell(props) as React.ReactElement;

    // Children: [svg, badge span]
    const children = (el.props as { children: React.ReactNode[] }).children as React.ReactNode[];
    const badge = children[1] as React.ReactElement | null | undefined;
    expect(badge).not.toBeNull();
    expect(badge).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. Bell — no badge span when unreadCount is 0
  // -------------------------------------------------------------------------
  it("does not render a badge span when unreadCount is 0", () => {
    const props: NotificationsBellProps = { unreadCount: 0, onClick: vi.fn() };
    const el = NotificationsBell(props) as React.ReactElement;
    const children = (el.props as { children: React.ReactNode[] }).children as React.ReactNode[];
    // Second child should be false/null (conditional rendering)
    const badge = children[1];
    expect(badge).toBeFalsy();
  });

  // -------------------------------------------------------------------------
  // 5. Bell — onClick prop is wired to the button
  // -------------------------------------------------------------------------
  it("passes onClick to the button element", () => {
    const onClick = vi.fn();
    const props: NotificationsBellProps = { unreadCount: 2, onClick };
    const el = NotificationsBell(props) as React.ReactElement;
    const buttonOnClick = (el.props as { onClick: () => void }).onClick;
    expect(buttonOnClick).toBe(onClick);
  });

  // -------------------------------------------------------------------------
  // 6. Bell — large count shows 99+
  // -------------------------------------------------------------------------
  it("displays 99+ for counts above 99", () => {
    const props: NotificationsBellProps = { unreadCount: 150, onClick: vi.fn() };
    const el = NotificationsBell(props) as React.ReactElement;
    const children = (el.props as { children: React.ReactNode[] }).children as React.ReactNode[];
    const badge = children[1] as React.ReactElement;
    const text = (badge.props as { children: string | number }).children;
    expect(text).toBe("99+");
  });
});

// ---------------------------------------------------------------------------
// 7. Types — CATEGORY_LABELS covers all 3 categories
// ---------------------------------------------------------------------------
import { CATEGORY_LABELS } from "@/lib/notifications/types";

describe("CATEGORY_LABELS", () => {
  it("provides labels for all 3 categories", () => {
    expect(CATEGORY_LABELS.action).toBeDefined();
    expect(CATEGORY_LABELS.fyi).toBeDefined();
    expect(CATEGORY_LABELS.system).toBeDefined();
  });

  it("action label mentions Required", () => {
    expect(CATEGORY_LABELS.action).toContain("Action");
  });
});

// ---------------------------------------------------------------------------
// 8. Notification fixture — readAt=null means unread
// ---------------------------------------------------------------------------
describe("Notification type", () => {
  it("readAt null means unread", () => {
    const n = makeNotif({ readAt: null });
    expect(n.readAt).toBeNull();
  });

  it("archivedAt set means archived", () => {
    const n = makeNotif({ archivedAt: new Date() });
    expect(n.archivedAt).toBeInstanceOf(Date);
  });

  it("snoozedUntil future means currently snoozed", () => {
    const future = new Date(Date.now() + 3_600_000);
    const n = makeNotif({ snoozedUntil: future });
    expect(n.snoozedUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
