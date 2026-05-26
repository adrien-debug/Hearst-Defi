import type { ReactNode, TextareaHTMLAttributes } from "react";

import type { AIPromptBoxVariantProps } from "./ai-prompt-box.variants";

export type AIPromptBoxVariant = NonNullable<AIPromptBoxVariantProps["variant"]>;
export type AIPromptBoxSize = NonNullable<AIPromptBoxVariantProps["size"]>;

export interface AIPromptBoxAttachment {
  /** Stable id within the parent. */
  id: string;
  /** Visible label (file name, etc.). */
  label: string;
  /** Optional preview / icon. */
  preview?: ReactNode;
  /** Optional bytes for the chip secondary line. */
  size?: number;
}

export interface AIPromptBoxProps
  extends Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      "onChange" | "onSubmit" | "value" | "size"
    >,
    AIPromptBoxVariantProps {
  /** Controlled value. */
  value: string;
  /** Called on every keystroke. */
  onChange: (next: string) => void;
  /** Fired on Enter (unless `submitOnEnter=false`) or submit-button click. */
  onSubmit: (value: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Current attachments (controlled). */
  attachments?: AIPromptBoxAttachment[];
  /** MIME-type accept list (forwarded to a hidden `<input type="file" />`). */
  attachmentsAccept?: string;
  /** Suggestion chips rendered above the textarea. */
  suggestions?: string[];
  /** Model badge shown bottom-left (e.g. "Kimi K2.6"). */
  model?: string;
  /** Maximum character count (controls the counter). */
  maxLength?: number;
  /** When false, Enter inserts a newline. Default `true`. */
  submitOnEnter?: boolean;
  /** Loading state — pulse animation + disabled submit. */
  loading?: boolean;
  /** Fired when user picks files via the paperclip. */
  onAttach?: (files: File[]) => void;
  /** Fired when user removes an attachment by id. */
  onAttachmentRemove?: (id: string) => void;
  /** Custom submit label. Defaults to "Send". */
  submitLabel?: string;
}
