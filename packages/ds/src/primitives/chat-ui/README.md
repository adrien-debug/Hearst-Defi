# `chat-ui`

ChatGPT / Claude-style message log.

```tsx
<Chat variant="bubbles">
  <ChatMessage role="user" content="Quel APY ?" timestamp={Date.now()} />
  <ChatMessage
    role="assistant"
    content="Le range 9.4-12.8 % reflète…"
    streaming
    actions={[
      { id: "copy", label: "Copy", onClick: () => navigator.clipboard.writeText(text) },
      { id: "retry", label: "Retry", onClick: regenerate },
    ]}
  />
</Chat>
```

The `Chat` viewport auto-scrolls to bottom on new content **unless** the user has scrolled up — pass `autoScroll={false}` to disable entirely. `role="log"` + `aria-live="polite"` for AT.
