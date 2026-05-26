import type * as React from "react";

export interface KanbanProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Called when a card is dropped on a column. */
  onMove?: (
    cardId: string,
    fromColId: string,
    toColId: string,
    toIndex: number,
  ) => void;
}

export interface KanbanColumnProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  id: string;
  title: React.ReactNode;
  count?: number;
}

export interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
}
