import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { StartupGate } from "./StartupGate";

vi.mock("@yakumo-internal/models", () => ({
  changeModelStoreWorkspace: vi.fn(),
}));

describe("StartupGate", () => {
  test("shows loading while global models load", () => {
    render(
      <StartupGate loadGlobalModels={() => new Promise(() => {})}>
        <div>App Ready</div>
      </StartupGate>,
    );

    expect(screen.getByRole("status").textContent).toContain("Loading Yaak");
    expect(screen.queryByText("App Ready")).toBeNull();
  });

  test("renders the app after global models load", async () => {
    render(
      <StartupGate loadGlobalModels={() => Promise.resolve()}>
        <div>App Ready</div>
      </StartupGate>,
    );

    expect(await screen.findByText("App Ready")).toBeTruthy();
  });

  test("shows a recoverable error when global model loading fails", async () => {
    const loadGlobalModels = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValueOnce();

    render(
      <StartupGate loadGlobalModels={loadGlobalModels}>
        <div>App Ready</div>
      </StartupGate>,
    );

    expect(await screen.findByText("Unable to start Yaak")).toBeTruthy();
    expect(screen.getByText("load failed").textContent).toBe("load failed");

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    await waitFor(() => expect(loadGlobalModels).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("App Ready")).toBeTruthy();
  });
});
