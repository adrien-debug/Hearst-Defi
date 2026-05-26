# `notification-center`

Right-edge slide-in for in-app notifications.

```tsx
<NotificationCenter
  open={open}
  onOpenChange={setOpen}
  items={notifications}
  onMarkAllRead={markAllRead}
  onItemClick={(it) => router.push(`/notifications/${it.id}`)}
/>
```

Auto-groups items by date (Today / Yesterday / Older). Unread count is rendered next to the title.
