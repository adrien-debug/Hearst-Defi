# Loader

5 indeterminate loaders + 1 progress bar. Import the keyframes CSS once:

```ts
import "@ds/primitives/loader/loader.css";
```

```tsx
<Loader />                                {/* spinner */}
<Loader variant="dots" label="Thinking" />
<Loader variant="progress" value={0.42} />
```
