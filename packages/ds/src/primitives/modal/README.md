# Modal

Token-driven dialog with focus trap, escape close, restore focus, body scroll lock. Sizes `sm | md | lg | xl | full`, variants `default | centered | sheet-bottom`.

```tsx
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalClose,
} from "@ds/primitives/modal";

<Modal>
  <ModalTrigger>Open</ModalTrigger>
  <ModalContent size="lg" variant="centered">
    <ModalHeader>
      <ModalTitle>Heads up</ModalTitle>
      <ModalDescription>This action is irreversible.</ModalDescription>
    </ModalHeader>
    <ModalBody>…</ModalBody>
    <ModalFooter>
      <ModalClose>Cancel</ModalClose>
    </ModalFooter>
  </ModalContent>
</Modal>;
```

A11y: `role="dialog"` + `aria-modal`, `aria-labelledby` wired to `<ModalTitle/>`, Tab/Shift+Tab focus trap, restore focus to opener on close.
