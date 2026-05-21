import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, test, vi } from "vitest";
import { SettingsTabContent, type SettingsTab } from "./Settings";

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ close: vi.fn() }),
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  type: () => "macos",
}));

vi.mock("@yakumo-internal/license", () => ({
  useLicense: () => ({ check: { data: null } }),
}));

vi.mock("../../lib/appInfo", () => ({
  appInfo: { featureLicense: true },
}));

vi.mock("./SettingsGeneral", () => ({
  SettingsGeneral: () => <div data-testid="settings-general">General</div>,
}));

vi.mock("./SettingsInterface", () => ({
  SettingsInterface: () => <div data-testid="settings-interface">Interface</div>,
}));

vi.mock("./SettingsHotkeys", () => ({
  SettingsHotkeys: () => <div data-testid="settings-hotkeys">Hotkeys</div>,
}));

vi.mock("./SettingsCertificates", () => ({
  SettingsCertificates: () => <div data-testid="settings-certificates">Certificates</div>,
}));

vi.mock("./SettingsProxy", () => ({
  SettingsProxy: () => <div data-testid="settings-proxy">Proxy</div>,
}));

vi.mock("./SettingsLicense", () => ({
  SettingsLicense: () => <div data-testid="settings-license">License</div>,
}));

function renderTab(value: SettingsTab) {
  return render(
    <Suspense>
      <SettingsTabContent value={value} />
    </Suspense>,
  );
}

describe("SettingsTabContent", () => {
  test("renders only the active tab, then loads a new tab when selected", async () => {
    const { rerender } = renderTab("general");

    expect(await screen.findByTestId("settings-general")).toBeTruthy();
    expect(screen.queryByTestId("settings-interface")).toBeNull();
    expect(screen.queryByTestId("settings-hotkeys")).toBeNull();

    rerender(
      <Suspense>
        <SettingsTabContent value="interface" />
      </Suspense>,
    );

    expect(await screen.findByTestId("settings-interface")).toBeTruthy();
    expect(screen.queryByTestId("settings-general")).toBeNull();
    expect(screen.queryByTestId("settings-hotkeys")).toBeNull();
  });
});
