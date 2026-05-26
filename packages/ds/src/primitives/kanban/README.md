# Kanban

Drag-and-drop kanban board using native HTML5 DnD (no extra deps).

```tsx
<Kanban onMove={(cardId, from, to) => move(cardId, from, to)}>
  <KanbanColumn id="todo" title="To Do" count={items.todo.length}>
    {items.todo.map((i) => <KanbanCard key={i.id} id={i.id}>{i.title}</KanbanCard>)}
  </KanbanColumn>
</Kanban>
```
