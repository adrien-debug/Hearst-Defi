import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { NotificationCenter } from "./notification-center";
import type { NotificationItem } from "./notification-center.types";

const now = new Date();
const items: NotificationItem[] = [
  {
    id: "a",
    title: "Distribution sent",
    body: "12.4 USDC distributed",
    ts: now,
    severity: "success",
    read: false,
  },
  {
    id: "b",
    title: "Stale oracle",
    body: "Oracle older than 30 min",
    ts: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    severity: "warning",
    read: true,
  },
];

describe("NotificationCenter", () => {
  afterEach(() => cleanup());

  it("renders all items and groups them by day", () => {
    render(
      <NotificationCenter open onOpenChange={() => {}} items={items} />,
    );
    expect(screen.getByText("Distribution sent")).toBeTruthy();
    expect(screen.getByText("Stale oracle")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Yesterday")).toBeTruthy();
  });

  it("calls onMarkAllRead when there are unread items", () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationCenter
        open
        onOpenChange={() => {}}
        items={items}
        onMarkAllRead={onMarkAllRead}
      />,
    );
    fireEvent.click(screen.getByText("Mark all read"));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no items", () => {
    render(<NotificationCenter open onOpenChange={() => {}} items={[]} />);
    expect(screen.getByText("You are all caught up")).toBeTruthy();
  });

  it("calls onItemClick", () => {
    const onItemClick = vi.fn();
    render(
      <NotificationCenter
        open
        onOpenChange={() => {}}
        items={items}
        onItemClick={onItemClick}
      />,
    );
    fireEvent.click(screen.getByText("Distribution sent"));
    expect(onItemClick).toHaveBeenCalled();
  });
});
