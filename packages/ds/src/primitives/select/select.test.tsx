import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Select } from "./select";

const options = [
  { value: "btc", label: "Bitcoin" },
  { value: "eth", label: "Ethereum" },
  { value: "sol", label: "Solana", disabled: true },
];

describe("Select", () => {
  it("renders a labelled trigger with placeholder", () => {
    render(<Select label="Asset" placeholder="Pick one" options={options} />);
    expect(screen.getByText(/asset/i)).toBeTruthy();
    expect(screen.getByText(/pick one/i)).toBeTruthy();
  });

  it("shows the controlled value text in the trigger", () => {
    render(
      <Select
        label="Asset"
        options={options}
        defaultValue="eth"
        placeholder="Pick one"
      />,
    );
    expect(screen.getByText(/ethereum/i)).toBeTruthy();
  });

  it("exposes an alert and aria-invalid when error is set", () => {
    render(
      <Select label="Asset" options={options} error="Must select something" />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toMatch(/must select/i);
  });
});
