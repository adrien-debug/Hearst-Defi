import type * as React from "react";

export type TopbarVariant = "default" | "bordered" | "floating" | "glass";

export interface TopbarProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TopbarVariant;
  sticky?: boolean;
  /** Left slot (logo, breadcrumb). */
  left?: React.ReactNode;
  /** Center slot (search). */
  center?: React.ReactNode;
  /** Right slot (actions, avatar). */
  right?: React.ReactNode;
}
