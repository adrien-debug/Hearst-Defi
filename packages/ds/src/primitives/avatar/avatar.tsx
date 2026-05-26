"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type {
  AvatarGroupProps,
  AvatarProps,
  AvatarSize,
  AvatarStatusProps,
} from "./avatar.types";
import { avatarStatusVariants, avatarVariants } from "./avatar.variants";

interface AvatarContextValue {
  size: AvatarSize;
}

const AvatarContext = React.createContext<AvatarContextValue>({ size: "md" });

function deriveInitials(value?: string): string {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "?");
}

/**
 * Avatar — user/account image with graceful fallback + optional status indicator.
 *
 * @example
 * <Avatar src="/me.png" alt="Adrien" fallback="AC" />
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  function Avatar(
    {
      className,
      variant = "default",
      size = "md",
      src,
      alt,
      fallback,
      children,
      ...rest
    },
    ref,
  ) {
    const [errored, setErrored] = React.useState(false);
    const showImg = Boolean(src) && !errored;
    const initials =
      typeof fallback === "string"
        ? fallback
        : fallback ?? deriveInitials(alt);

    return (
      <AvatarContext.Provider value={{ size }}>
        <span
          ref={ref}
          className={cn(avatarVariants({ variant, size }), className)}
          {...rest}
        >
          {showImg ? (
            <img
              src={src}
              alt={alt ?? ""}
              onError={() => setErrored(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
          {children}
        </span>
      </AvatarContext.Provider>
    );
  },
);

/**
 * AvatarStatus — small dot indicator (online/offline/away/busy) placed
 * absolutely in the bottom-right of an Avatar.
 */
export const AvatarStatus = React.forwardRef<HTMLSpanElement, AvatarStatusProps>(
  function AvatarStatus({ className, variant, size, ...rest }, ref) {
    const ctx = React.useContext(AvatarContext);
    const effectiveSize = size ?? ctx.size;
    const label = `Status: ${variant}`;
    return (
      <span
        ref={ref}
        role="img"
        aria-label={label}
        className={cn(
          avatarStatusVariants({ variant, size: effectiveSize }),
          className,
        )}
        {...rest}
      />
    );
  },
);

/**
 * AvatarGroup — horizontally stacked avatars with overflow bubble.
 */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  function AvatarGroup(
    { className, max = 3, size = "md", children, ...rest },
    ref,
  ) {
    const items = React.Children.toArray(children);
    const visible = items.slice(0, max);
    const overflow = items.length - visible.length;

    return (
      <AvatarContext.Provider value={{ size }}>
        <div
          ref={ref}
          className={cn(
            "ds-inline-flex ds-flex-row-reverse ds-items-center",
            className,
          )}
          style={{
            paddingLeft: "var(--ds-spacing-2)",
          }}
          {...rest}
        >
          {overflow > 0 ? (
            <span
              className={cn(
                avatarVariants({ variant: "default", size }),
                "ds--ml-[var(--ds-spacing-2)]",
              )}
              style={{
                marginLeft: "calc(-1 * var(--ds-spacing-2))",
                position: "relative",
                zIndex: 0,
              }}
              aria-label={`${overflow} more`}
            >
              +{overflow}
            </span>
          ) : null}
          {visible
            .slice()
            .reverse()
            .map((child, idx) => (
              <span
                key={idx}
                style={{
                  marginLeft: "calc(-1 * var(--ds-spacing-2))",
                  position: "relative",
                  zIndex: idx + 1,
                }}
              >
                {child}
              </span>
            ))}
        </div>
      </AvatarContext.Provider>
    );
  },
);
