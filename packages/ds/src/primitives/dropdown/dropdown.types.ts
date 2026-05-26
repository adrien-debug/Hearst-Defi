import type * as React from "react";

export type DropdownSize = "sm" | "md" | "lg";
export type DropdownAlign = "start" | "center" | "end";
export type DropdownSide = "top" | "right" | "bottom" | "left";

export interface DropdownProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export interface DropdownTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface DropdownContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: DropdownSize;
  align?: DropdownAlign;
  side?: DropdownSide;
  sideOffset?: number;
}

export interface DropdownItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  disabled?: boolean;
  destructive?: boolean;
  inset?: boolean;
  shortcut?: string;
  onSelect?: () => void;
}

export interface DropdownSeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface DropdownLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export interface DropdownCheckboxItemProps
  extends Omit<DropdownItemProps, "onSelect"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export interface DropdownRadioGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface DropdownRadioItemProps
  extends Omit<DropdownItemProps, "onSelect"> {
  value: string;
}

export interface DropdownSubProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export interface DropdownSubTriggerProps
  extends Omit<DropdownItemProps, "onSelect"> {}
export interface DropdownSubContentProps extends DropdownContentProps {}
