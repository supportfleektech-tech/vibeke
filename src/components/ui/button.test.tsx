import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders primary", () => {
    render(<Button>Kinara</Button>);
    const el = screen.getByText("Kinara");
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("Kinara");
  });
  it("disables when loading", () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
