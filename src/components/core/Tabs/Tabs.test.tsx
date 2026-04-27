import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { TabContent, Tabs } from "./Tabs";

vi.mock("@tauri-apps/plugin-os", () => ({
  type: () => "macos",
}));

vi.mock("../../../hooks/useKeyValue", () => ({
  useKeyValue: () => ({
    value: { order: [], activeTabs: {} },
    set: vi.fn(),
  }),
}));

describe("Tabs", () => {
  test("can render only the active tab content", async () => {
    render(
      <Tabs
        label="Test tabs"
        tabs={[
          { value: "first", label: "First" },
          { value: "second", label: "Second" },
        ]}
        renderActiveContentOnly
      >
        <TabContent value="first">First content</TabContent>
        <TabContent value="second">Second content</TabContent>
      </Tabs>,
    );

    expect(screen.getByText("First content")).toBeTruthy();
    expect(screen.queryByText("Second content")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Second" }));

    expect(await screen.findByText("Second content")).toBeTruthy();
    expect(screen.queryByText("First content")).toBeNull();
  });
});
