import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "./button";

describe("Button", () => {
  it("renders children and is a button by default", () => {
    render(<Button>Click me</Button>);
    const el = screen.getByRole("button", { name: /click me/i });
    expect(el).toBeTruthy();
    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("type")).toBe("button");
  });

  it("applies the requested variant + size via data attributes", () => {
    render(
      <Button variant="danger" size="lg">
        Boom
      </Button>,
    );
    const el = screen.getByRole("button", { name: /boom/i });
    expect(el.getAttribute("data-variant")).toBe("danger");
    expect(el.getAttribute("data-size")).toBe("lg");
  });

  it("becomes aria-busy + disabled when loading", () => {
    render(<Button loading>Saving</Button>);
    const el = screen.getByRole("button", { name: /saving/i });
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect((el as HTMLButtonElement).disabled).toBe(true);
    expect(el.getAttribute("data-loading")).toBe("true");
  });
});
