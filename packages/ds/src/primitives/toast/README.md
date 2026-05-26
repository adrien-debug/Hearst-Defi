# Toast

Pile de notifications transitoires. Monter `<ToastProvider/>` au root puis appeler `useToast()` n'importe où. Variants `default | success | error | warning | info`. Positions `top-right` (défaut) / `top-center` / `bottom-right` / `bottom-center`. Stack max 3.

```tsx
// root
import { ToastProvider, ToastViewport } from "@ds/primitives/toast";

<ToastProvider position="top-right">
  {children}
  <ToastViewport />
</ToastProvider>;

// usage
import { useToast } from "@ds/primitives/toast";

function Save(): JSX.Element {
  const { toast } = useToast();
  return (
    <button
      onClick={() =>
        toast({ title: "Saved", description: "Your draft is safe.", variant: "success" })
      }
    >
      save
    </button>
  );
}
```

A11y: viewport en `role="region" aria-live="polite"`. Erreurs en `role="alert"`.
