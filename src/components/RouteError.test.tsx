import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import RouteError from "./RouteError";

vi.mock("@tauri-apps/plugin-os", () => ({
  type: () => "macos",
}));

describe("RouteError", () => {
  test("renders outside a Jotai provider", () => {
    render(<RouteError error={new Error("route failed")} />);

    expect(screen.getByText(/Route Error/).textContent).toContain("Route Error");
    expect(screen.getByText("route failed").textContent).toContain("route failed");
    expect(screen.getByRole("button", { name: "Go Home" }).textContent).toBe("Go Home");
    expect(screen.getByRole("button", { name: "Refresh" }).textContent).toBe("Refresh");
  });
});
