import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Combobox } from "./combobox";

const options = [
  { value: "btc", label: "Bitcoin" },
  { value: "eth", label: "Ethereum" },
  { value: "sol", label: "Solana" },
];

describe("Combobox", () => {
  it("renders an accessible combobox input", () => {
    render(
      <Combobox
        label="Asset"
        placeholder="Pick"
        options={options}
      />,
    );
    const input = screen.getByRole("combobox");
    expect(input).toBeTruthy();
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
  });

  it("shows the controlled single value as its display text", () => {
    render(
      <Combobox label="Asset" options={options} defaultValue="eth" />,
    );
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Ethereum");
  });

  it("exposes aria-invalid + alert when error is set", () => {
    render(
      <Combobox label="Asset" options={options} error="Pick something" />,
    );
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toMatch(/pick something/i);
  });
});
