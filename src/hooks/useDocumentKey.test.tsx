import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useDocumentKey } from "./useDocumentKey";

function KeyProbe({ onKey }: { onKey: (event: KeyboardEvent) => void }) {
  useDocumentKey((event) => event.key === "Escape", onKey);
  return null;
}

describe("useDocumentKey", () => {
  test("runs the callback when the key filter matches", () => {
    const onKey = vi.fn();
    render(<KeyProbe onKey={onKey} />);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onKey).toHaveBeenCalledTimes(1);
  });
});
