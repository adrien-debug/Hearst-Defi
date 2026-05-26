# `ai-prompt-box`

XL textarea for LLM prompts. Suggestions, attachments, model badge, char counter, Enter-to-submit.

```tsx
const [value, setValue] = useState("");

<AIPromptBox
  value={value}
  onChange={setValue}
  onSubmit={(v) => sendToLLM(v)}
  suggestions={["Explain APY range", "Summarize last attestation"]}
  model="Kimi K2.6"
  maxLength={4000}
  attachments={files}
  onAttach={(picks) => setFiles((prev) => [...prev, ...picks.map(f => ({...}))])}
  onAttachmentRemove={(id) => setFiles((p) => p.filter(x => x.id !== id))}
  loading={waiting}
/>
```

`Enter` submits, `Shift+Enter` newline. Disable with `submitOnEnter={false}`.
