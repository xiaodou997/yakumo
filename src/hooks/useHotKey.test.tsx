import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useFormattedHotkey } from "./useHotKey";

vi.mock("@tauri-apps/plugin-os", () => ({
  type: () => "macos",
}));

function HotkeyProbe() {
  const labelParts = useFormattedHotkey(null);
  return <div data-testid="hotkey">{labelParts == null ? "null" : labelParts.join("")}</div>;
}

describe("useFormattedHotkey", () => {
  test("returns null without reading settings when action is null", () => {
    const { getByTestId } = render(<HotkeyProbe />);

    expect(getByTestId("hotkey").textContent).toBe("null");
  });
});
