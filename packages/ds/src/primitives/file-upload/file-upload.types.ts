import type { HTMLAttributes, ReactNode } from "react";

export type FileUploadVariant = "default" | "minimal";
export type FileUploadSize = "sm" | "md" | "lg";

export interface FileUploadItem {
  /** Stable id (callers usually use `file.name + index` or a hash). */
  id: string;
  /** Underlying File. */
  file: File;
  /** 0..1 upload progress. Optional — when omitted, no bar is rendered. */
  progress?: number;
  /** Localised error message. When set, item is rendered in danger state. */
  error?: string;
}

export interface FileUploadError {
  file: File;
  reason: "too-large" | "wrong-type";
  message: string;
}

export interface FileUploadProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onDrop"> {
  variant?: FileUploadVariant;
  size?: FileUploadSize;
  /** Accept MIME pattern (forwarded to the underlying input). */
  accept?: string;
  /** Maximum size in bytes. Files larger are rejected via `onReject`. */
  maxSize?: number;
  /** Allow multiple files. Defaults to true. */
  multiple?: boolean;
  /** Called with files that passed validation. */
  onFiles: (files: File[]) => void;
  /** Optional rejection callback for files that failed validation. */
  onReject?: (errors: FileUploadError[]) => void;
  /** Currently controlled list of items (with progress + errors). */
  files?: FileUploadItem[];
  /** Show image thumbnails for image files (URL.createObjectURL). */
  showPreview?: boolean;
  /** Fired when an existing item's remove button is pressed. */
  onItemRemove?: (id: string) => void;
  /** Override the headline copy. */
  headline?: ReactNode;
  /** Override the sub-headline. */
  subline?: ReactNode;
  /** Disable interactions. */
  disabled?: boolean;
}
