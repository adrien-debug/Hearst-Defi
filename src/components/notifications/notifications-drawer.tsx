"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { cn } from "@/lib/cn";
import {
  markAsRead,
  markAllAsRead,
  archive,
  snooze,
} from "@/lib/notifications/actions";
import {
  CATEGORY_LABELS,
  type Notification,
  type NotificationCategory,
} from "@/lib/notifications/types";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type FilterTab = "all" | NotificationCategory;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "action", label: "Action" },
  { key: "fyi", label: "FYI" },
  { key: "system", label: "System" },
];

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface NotifRowProps {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
  isPending: boolean;
}

function NotifRow({
  notif,
  onMarkRead,
  onArchive,
  onSnooze,
  isPending,
}: NotifRowProps) {
  const isUnread = notif.readAt === null;
  const isUrgent = notif.severity === "urgent";

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-[var(--ct-radius-md)] p-3",
        "border border-transparent transition-colors duration-[var(--ct-dur-base)]",
        isUnread
          ? "bg-[var(--ct-surface-1)] hover:bg-[var(--ct-surface-2)]"
          : "opacity-60 hover:opacity-80",
        isUrgent && isUnread && "border-[var(--ct-status-danger-border)]",
      )}
    >
      {/* Severity dot */}
      <div className="mt-1 flex-shrink-0">
        <span
          className={cn(
            "block h-2 w-2 rounded-full",
            isUnread
              ? isUrgent
                ? "bg-[var(--ct-status-danger)]"
                : "bg-[var(--ct-accent)]"
              : "bg-[var(--ct-border-strong)]",
          )}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-xs font-medium leading-snug",
              isUnread
                ? "text-[var(--ct-text-strong)]"
                : "text-[var(--ct-text-muted)]",
            )}
          >
            {notif.title}
          </p>
          <span className="flex-shrink-0 text-[10px] text-[var(--ct-text-muted)]">
            {relativeTime(new Date(notif.createdAt))}
          </span>
        </div>
        {notif.body && (
          <p className="mt-0.5 text-[11px] text-[var(--ct-text-muted)] line-clamp-2">
            {notif.body}
          </p>
        )}
        {/* Action buttons row */}
        <div className="mt-2 flex items-center gap-2">
          {notif.actionHref && notif.actionLabel && (
            <a
              href={notif.actionHref}
              className={cn(
                "inline-flex h-6 items-center rounded-[var(--ct-radius-full)] px-2.5",
                "bg-[var(--ct-accent)] text-[10px] font-bold text-[var(--ct-bg-deep)]",
                "hover:bg-[var(--ct-accent-strong)] transition-colors duration-[var(--ct-dur-base)]",
              )}
              onClick={() => onMarkRead(notif.id)}
            >
              {notif.actionLabel}
            </a>
          )}
          {isUnread && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onMarkRead(notif.id)}
              className="text-[10px] text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)] disabled:opacity-50"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => onArchive(notif.id)}
            className="text-[10px] text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)] disabled:opacity-50"
          >
            Archive
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onSnooze(notif.id)}
            className="text-[10px] text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)] disabled:opacity-50"
          >
            Snooze 1h
          </button>
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: NotificationCategory;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
  isPending: boolean;
}

function CategorySection({
  category,
  notifications,
  onMarkRead,
  onArchive,
  onSnooze,
  isPending,
}: CategorySectionProps) {
  if (notifications.length === 0) return null;

  return (
    <section aria-labelledby={`notif-cat-${category}`}>
      <h3
        id={`notif-cat-${category}`}
        className="mb-2 text-[10px] font-semibold uppercase tracking-[var(--ct-tracking-wide)] text-[var(--ct-text-muted)]"
      >
        {CATEGORY_LABELS[category]} ({notifications.length})
      </h3>
      <div className="flex flex-col gap-1">
        {notifications.map((n) => (
          <NotifRow
            key={n.id}
            notif={n}
            onMarkRead={onMarkRead}
            onArchive={onArchive}
            onSnooze={onSnooze}
            isPending={isPending}
          />
        ))}
      </div>
    </section>
  );
}

export interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unread: Notification[];
  archived: Notification[];
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  unread,
  archived,
}: NotificationsDrawerProps) {
  if (!isOpen) return null;
  return (
    <DrawerBody
      onClose={onClose}
      unread={unread}
      archived={archived}
    />
  );
}

function DrawerBody({
  onClose,
  unread: initialUnread,
  archived: initialArchived,
}: Omit<NotificationsDrawerProps, "isOpen">) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isPending, startTransition] = useTransition();

  // Optimistic state
  const [unread, setUnread] = useState<Notification[]>(initialUnread);
  const [archived, setArchived] = useState<Notification[]>(initialArchived);

  const close = useCallback(() => onClose(), [onClose]);

  // Focus management
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      triggerRef.current?.focus?.();
    };
  }, []);

  // Escape + focus trap
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) { e.preventDefault(); return; }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const handleMarkRead = useCallback((id: string) => {
    // Optimistic update
    setUnread((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)),
    );
    startTransition(async () => {
      await markAsRead(id);
    });
  }, []);

  const handleMarkAllRead = useCallback(() => {
    const now = new Date();
    setUnread((prev) => prev.map((n) => ({ ...n, readAt: now })));
    startTransition(async () => {
      await markAllAsRead();
    });
  }, []);

  const handleArchive = useCallback((id: string) => {
    const now = new Date();
    setUnread((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target) {
        setArchived((a) => [{ ...target, archivedAt: now }, ...a]);
      }
      return prev.filter((n) => n.id !== id);
    });
    startTransition(async () => {
      await archive(id);
    });
  }, []);

  const handleSnooze = useCallback((id: string) => {
    const until = new Date(Date.now() + 60 * 60 * 1000); // 1h
    setUnread((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      await snooze(id, until);
    });
  }, []);

  // Filter for active tab
  const filteredUnread =
    activeTab === "all"
      ? unread
      : unread.filter((n) => n.category === activeTab);

  const categorized: NotificationCategory[] = ["action", "fyi", "system"];
  const unreadByCategory = (cat: NotificationCategory) =>
    filteredUnread.filter((n) => n.category === cat);

  const totalUnread = unread.filter((n) => n.readAt === null).length;

  const emptyState =
    activeTab === "all"
      ? unread.length === 0
      : filteredUnread.length === 0;

  return (
    <div
      className="fixed inset-0 flex items-start justify-end z-[var(--ct-z-modal)]"
      role="presentation"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-[var(--ct-bg-deep)]/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex h-full w-full max-w-sm flex-col",
          "border-l border-[var(--ct-border-strong)]",
          "bg-[var(--ct-glass-bg)] backdrop-blur-xl shadow-[var(--ct-shadow-elevated)]",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--ct-border-soft)] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              className="text-sm font-semibold text-[var(--ct-text-strong)]"
            >
              Notifications
            </h2>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-[var(--ct-radius-full)] bg-[var(--ct-accent)] px-1 text-[10px] font-bold text-[var(--ct-bg-deep)]">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)] disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close notifications"
              className={cn(
                "rounded-[var(--ct-radius-sm)] px-2 py-1 text-xs font-medium",
                "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
                "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
              )}
            >
              Close
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Notification categories"
          className="flex gap-1 border-b border-[var(--ct-border-soft)] px-4 py-2"
        >
          {TABS.map(({ key, label }) => {
            const count =
              key === "all"
                ? unread.filter((n) => n.readAt === null).length
                : unread.filter((n) => n.category === key && n.readAt === null).length;

            return (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-1 rounded-[var(--ct-radius-full)] px-2.5 py-1",
                  "text-xs transition-colors duration-[var(--ct-dur-base)]",
                  activeTab === key
                    ? "bg-[var(--ct-surface-2)] text-[var(--ct-text-strong)] font-medium"
                    : "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
                )}
              >
                {label}
                {count > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ct-accent)] px-0.5 text-[9px] font-bold text-[var(--ct-bg-deep)]"
                    aria-hidden="true"
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {emptyState ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="text-2xl" aria-hidden="true">
                🔔
              </span>
              <p className="text-xs text-[var(--ct-text-muted)]">
                No notifications
              </p>
            </div>
          ) : activeTab === "all" ? (
            <div className="flex flex-col gap-4">
              {categorized.map((cat) => {
                const items = unreadByCategory(cat);
                return (
                  <CategorySection
                    key={cat}
                    category={cat}
                    notifications={items}
                    onMarkRead={handleMarkRead}
                    onArchive={handleArchive}
                    onSnooze={handleSnooze}
                    isPending={isPending}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredUnread.map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Archived section (collapsed at bottom) */}
        {archived.length > 0 && (
          <details className="border-t border-[var(--ct-border-soft)]">
            <summary className="cursor-pointer px-4 py-2 text-[10px] font-semibold uppercase tracking-[var(--ct-tracking-wide)] text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]">
              Archived ({archived.length})
            </summary>
            <div className="flex flex-col gap-1 px-4 pb-3">
              {archived.slice(0, 20).map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                  isPending={isPending}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
