"use client";

/**
 * @ds/core/primitives/file-upload
 *
 * Drag-and-drop zone + click-to-browse. Controlled file list with progress + errors.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  ForwardedRef,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FileText, Upload, X } from "lucide-react";

import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";

import { fileUploadVariants } from "./file-upload.variants";
import type {
  FileUploadError,
  FileUploadProps,
} from "./file-upload.types";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const list = accept.split(",").map((a) => a.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.some((pattern) => {
    if (pattern.startsWith(".")) {
      return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    }
    if (pattern.endsWith("/*")) {
      const root = pattern.slice(0, -2);
      return file.type.startsWith(`${root}/`);
    }
    return file.type === pattern;
  });
}

function validateFiles(
  candidates: File[],
  accept: string | undefined,
  maxSize: number | undefined,
): { valid: File[]; rejected: FileUploadError[] } {
  const valid: File[] = [];
  const rejected: FileUploadError[] = [];
  for (const f of candidates) {
    if (!matchesAccept(f, accept)) {
      rejected.push({
        file: f,
        reason: "wrong-type",
        message: `${f.name} is not an accepted type.`,
      });
      continue;
    }
    if (maxSize !== undefined && f.size > maxSize) {
      rejected.push({
        file: f,
        reason: "too-large",
        message: `${f.name} exceeds ${formatBytes(maxSize)}.`,
      });
      continue;
    }
    valid.push(f);
  }
  return { valid, rejected };
}

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  function FileUpload(
    {
      accept,
      maxSize,
      multiple = true,
      onFiles,
      onReject,
      files,
      showPreview = true,
      onItemRemove,
      headline,
      subline,
      disabled,
      variant,
      size,
      className,
      ...rest
    }: FileUploadProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = fileUploadVariants({ variant, size });
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setDragging] = useState<boolean>(false);
    const [previewMap, setPreviewMap] = useState<Map<string, string>>(
      new Map(),
    );

    /* Maintain object URL previews. */
    useEffect(() => {
      if (!showPreview || !files) return;
      const next = new Map<string, string>();
      for (const item of files) {
        if (item.file.type.startsWith("image/")) {
          const url = URL.createObjectURL(item.file);
          next.set(item.id, url);
        }
      }
      setPreviewMap(next);
      return () => {
        next.forEach((url) => URL.revokeObjectURL(url));
      };
    }, [files, showPreview]);

    const ingest = useCallback(
      (candidates: File[]) => {
        if (disabled) return;
        const { valid, rejected } = validateFiles(
          candidates,
          accept,
          maxSize,
        );
        if (rejected.length > 0) onReject?.(rejected);
        if (valid.length > 0) {
          const out = multiple ? valid : valid.slice(0, 1);
          onFiles(out);
        }
      },
      [accept, disabled, maxSize, multiple, onFiles, onReject],
    );

    const onInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const fl = e.currentTarget.files;
        if (!fl) return;
        ingest(Array.from(fl));
        e.currentTarget.value = "";
      },
      [ingest],
    );

    const onDrop = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (disabled) return;
        const fl = e.dataTransfer?.files;
        if (!fl) return;
        ingest(Array.from(fl));
      },
      [disabled, ingest],
    );

    const onDragOver = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setDragging(true);
      },
      [disabled],
    );

    const onDragLeave = useCallback(
      (e: ReactDragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
      },
      [],
    );

    const onKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      },
      [],
    );

    const acceptText = useMemo(() => {
      if (!accept) return "Any file";
      return accept.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
    }, [accept]);

    return (
      <div
        ref={ref}
        className={cn(styles.root(), className)}
        {...rest}
      >
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          data-active={isDragging || undefined}
          data-disabled={disabled || undefined}
          aria-disabled={disabled || undefined}
          aria-label="File upload dropzone"
          className={styles.dropzone()}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={onKeyDown}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <span className={styles.icon()} aria-hidden="true">
            <Upload size={20} />
          </span>
          <div className={styles.headline()}>
            {headline ?? "Drag files here, or click to browse"}
          </div>
          <div className={styles.subline()}>
            {subline ??
              `${acceptText}${maxSize ? ` · max ${formatBytes(maxSize)}` : ""}`}
          </div>
          <input
            ref={composeRefs(inputRef)}
            type="file"
            hidden
            accept={accept}
            multiple={multiple}
            onChange={onInputChange}
            disabled={disabled}
          />
        </div>

        {files && files.length > 0 ? (
          <ul className={styles.fileList()} aria-label="Selected files">
            {files.map((item) => {
              const isImg = item.file.type.startsWith("image/");
              const url = previewMap.get(item.id);
              return (
                <li
                  key={item.id}
                  data-error={Boolean(item.error) || undefined}
                  className={styles.fileItem()}
                >
                  <span className={styles.thumb()} aria-hidden="true">
                    {showPreview && isImg && url ? (
                      <img
                        src={url}
                        alt=""
                        className={styles.thumbImg()}
                        draggable={false}
                      />
                    ) : (
                      <FileText size={16} />
                    )}
                  </span>
                  <div className={styles.fileBody()}>
                    <div className={styles.fileRow()}>
                      <span className={styles.fileName()}>{item.file.name}</span>
                      <span className={styles.fileSize()}>
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                    {item.progress !== undefined && !item.error ? (
                      <div
                        className={styles.progressTrack()}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                      >
                        <div
                          className={styles.progressFill()}
                          style={{
                            width: `${Math.min(100, Math.max(0, item.progress * 100))}%`,
                          }}
                        />
                      </div>
                    ) : null}
                    {item.error ? (
                      <span className={styles.errorText()}>{item.error}</span>
                    ) : null}
                  </div>
                  {onItemRemove ? (
                    <button
                      type="button"
                      className={styles.removeBtn()}
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => onItemRemove(item.id)}
                    >
                      <X aria-hidden="true" size={14} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  },
);

FileUpload.displayName = "FileUpload";
