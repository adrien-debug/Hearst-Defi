import type * as React from "react";

export type ContextMenuSize = "sm" | "md" | "lg";

export interface ContextMenuProps {
  children?: React.ReactNode;
}

export interface ContextMenuTriggerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

export interface ContextMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContextMenuSize;
}

export interface ContextMenuItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  disabled?: boolean;
  destructive?: boolean;
  inset?: boolean;
  shortcut?: string;
  onSelect?: () => void;
}

export interface ContextMenuSeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface ContextMenuLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export interface ContextMenuCheckboxItemProps
  extends Omit<ContextMenuItemProps, "onSelect"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export interface ContextMenuRadioGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface ContextMenuRadioItemProps
  extends Omit<ContextMenuItemProps, "onSelect"> {
  value: string;
}
