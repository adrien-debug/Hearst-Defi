"use client";

/**
 * @ds/core/primitives/ai-prompt-box
 *
 * XL prompt textarea for LLM input — Stripe-grade keyboard handling.
 *
 * Spec: ./README.md
 */

import { forwardRef, useCallback, useRef } from "react";
import type {
  ChangeEvent,
  ForwardedRef,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ArrowUp, Paperclip, Sparkles, X } from "lucide-react";

import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";

import { aiPromptBoxVariants } from "./ai-prompt-box.variants";
import type { AIPromptBoxProps } from "./ai-prompt-box.types";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const AIPromptBox = forwardRef<HTMLTextAreaElement, AIPromptBoxProps>(
  function AIPromptBox(
    {
      value,
      onChange,
      onSubmit,
      placeholder = "Ask anything…",
      attachments,
      attachmentsAccept,
      suggestions,
      model,
      maxLength = 4000,
      submitOnEnter = true,
      loading = false,
      onAttach,
      onAttachmentRemove,
      submitLabel = "Send",
      variant,
      size,
      className,
      disabled,
      ...rest
    }: AIPromptBoxProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
  ) {
    const styles = aiPromptBoxVariants({ variant, size });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submit = useCallback(() => {
      const trimmed = value.trim();
      if (!trimmed || loading || disabled) return;
      onSubmit(trimmed);
    }, [value, onSubmit, loading, disabled]);

    const onKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
          e.preventDefault();
          submit();
        }
      },
      [submit, submitOnEnter],
    );

    const onTextareaChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.currentTarget.value;
        if (next.length > maxLength) return;
        onChange(next);
      },
      [onChange, maxLength],
    );

    const onPickSuggestion = useCallback(
      (s: string) => {
        onChange(s);
        textareaRef.current?.focus();
      },
      [onChange],
    );

    const onFileChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (!files || files.length === 0 || !onAttach) return;
        onAttach(Array.from(files));
        e.currentTarget.value = "";
      },
      [onAttach],
    );

    const charCount = value.length;
    const over = charCount > maxLength;
    const submitDisabled = loading || disabled || value.trim().length === 0;

    return (
      <div
        className={cn(styles.root(), className)}
        data-loading={loading || undefined}
        data-disabled={disabled || undefined}
      >
        {suggestions && suggestions.length > 0 && value.length === 0 ? (
          <div className={styles.suggestions()} role="list">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                role="listitem"
                className={styles.suggestionChip()}
                onClick={() => onPickSuggestion(s)}
              >
                <Sparkles
                  aria-hidden="true"
                  size={12}
                  className="mr-[var(--ds-spacing-1)]"
                />
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {attachments && attachments.length > 0 ? (
          <div className={styles.attachmentRow()} aria-label="Attachments">
            {attachments.map((a) => (
              <span key={a.id} className={styles.attachmentChip()}>
                {a.preview ?? null}
                <span className="max-w-[16ch] truncate">{a.label}</span>
                {a.size !== undefined ? (
                  <span className="text-[color:var(--ds-text-secondary)]">
                    {formatBytes(a.size)}
                  </span>
                ) : null}
                {onAttachmentRemove ? (
                  <button
                    type="button"
                    aria-label={`Remove ${a.label}`}
                    onClick={() => onAttachmentRemove(a.id)}
                    className="text-[color:var(--ds-text-secondary)] hover:text-[color:var(--ds-text-primary)] cursor-pointer"
                  >
                    <X aria-hidden="true" size={12} />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}

        <textarea
          ref={composeRefs(ref, textareaRef)}
          className={styles.textarea()}
          value={value}
          onChange={onTextareaChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-label="Prompt"
          aria-busy={loading || undefined}
          {...rest}
        />

        <div className={styles.footer()}>
          <div className={styles.footerLeft()}>
            {onAttach ? (
              <>
                <button
                  type="button"
                  className={styles.attachButton()}
                  aria-label="Attach files"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || loading}
                >
                  <Paperclip aria-hidden="true" size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept={attachmentsAccept}
                  onChange={onFileChange}
                />
              </>
            ) : null}
            {model ? (
              <span className={styles.modelBadge()} aria-label={`Model ${model}`}>
                {model}
              </span>
            ) : null}
          </div>

          <div className={styles.footerRight()}>
            <span
              className={styles.counter()}
              data-over={over || undefined}
              aria-live="polite"
            >
              {charCount} / {maxLength}
            </span>
            <button
              type="button"
              className={styles.submit()}
              disabled={submitDisabled}
              onClick={submit}
              aria-label={submitLabel}
            >
              <span>{submitLabel}</span>
              <ArrowUp aria-hidden="true" size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  },
);

AIPromptBox.displayName = "AIPromptBox";
