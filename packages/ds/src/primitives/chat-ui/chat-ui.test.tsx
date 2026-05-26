import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Chat, ChatMessage } from "./chat-ui";

describe("Chat / ChatMessage", () => {
  afterEach(() => cleanup());

  it("renders messages and a log role on the container", () => {
    render(
      <Chat>
        <ChatMessage role="user" content="Hello" />
        <ChatMessage role="assistant" content="Hi there" />
      </Chat>,
    );
    expect(screen.getByRole("log")).toBeTruthy();
    expect(screen.getByText("Hello")).toBeTruthy();
    expect(screen.getByText("Hi there")).toBeTruthy();
  });

  it("renders a streaming cursor", () => {
    const { container } = render(
      <ChatMessage role="assistant" content="streaming…" streaming />,
    );
    expect(container.querySelector("[data-streaming='true']")).toBeTruthy();
  });

  it("fires action handlers", () => {
    const copy = vi.fn();
    render(
      <ChatMessage
        role="assistant"
        content="Answer"
        actions={[{ id: "copy", label: "Copy", onClick: copy }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(copy).toHaveBeenCalledTimes(1);
  });
});
