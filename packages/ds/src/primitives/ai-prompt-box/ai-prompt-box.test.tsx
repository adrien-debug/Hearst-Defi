import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AIPromptBox } from "./ai-prompt-box";

describe("AIPromptBox", () => {
  afterEach(() => cleanup());

  it("renders placeholder and counter", () => {
    render(
      <AIPromptBox
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        placeholder="Ask…"
        maxLength={100}
      />,
    );
    expect(screen.getByPlaceholderText("Ask…")).toBeTruthy();
    expect(screen.getByText(/0 \/ 100/)).toBeTruthy();
  });

  it("submits on Enter when value is non-empty", () => {
    const onSubmit = vi.fn();
    render(
      <AIPromptBox value="hello" onChange={() => {}} onSubmit={onSubmit} />,
    );
    const ta = screen.getByLabelText("Prompt") as HTMLTextAreaElement;
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("hello");
  });

  it("does not submit when loading or empty; disables button", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <AIPromptBox value="" onChange={() => {}} onSubmit={onSubmit} />,
    );
    const btn = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    rerender(
      <AIPromptBox value="hi" onChange={() => {}} onSubmit={onSubmit} loading />,
    );
    const btn2 = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(btn2.disabled).toBe(true);
  });

  it("shows suggestion chips and fills value on click", () => {
    const onChange = vi.fn();
    render(
      <AIPromptBox
        value=""
        onChange={onChange}
        onSubmit={() => {}}
        suggestions={["Explain APY", "What is provenance"]}
      />,
    );
    fireEvent.click(screen.getByText("Explain APY"));
    expect(onChange).toHaveBeenCalledWith("Explain APY");
  });
});
