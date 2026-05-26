# `file-upload`

Drag-and-drop zone + click-to-browse, with controlled file list, progress, and validation.

```tsx
const [items, setItems] = useState<FileUploadItem[]>([]);

<FileUpload
  accept="image/*,.pdf"
  maxSize={10 * 1024 * 1024}      // 10 MB
  files={items}
  showPreview
  onFiles={(files) =>
    setItems((prev) => [
      ...prev,
      ...files.map((f, i) => ({ id: `${f.name}-${prev.length + i}`, file: f, progress: 0 })),
    ])
  }
  onReject={(errors) => toast(errors.map(e => e.message).join("\n"))}
  onItemRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
/>
```

`progress` is `0..1`. Image MIME types render a thumbnail (object URL revoked on unmount).
