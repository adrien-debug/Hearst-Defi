import type * as React from "react";

export type AvatarVariant = "default" | "rounded" | "square";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarStatusVariant = "online" | "offline" | "away" | "busy";

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  src?: string;
  alt?: string;
  /** Fallback content displayed when the image fails to load. */
  fallback?: React.ReactNode;
  variant?: AvatarVariant;
  size?: AvatarSize;
}

export interface AvatarStatusProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant: AvatarStatusVariant;
  /** Inherit the parent avatar size. */
  size?: AvatarSize;
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum visible avatars before overflow bubble. */
  max?: number;
  size?: AvatarSize;
}
