import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("reads fallback and persists updates as JSON", () => {
    const { result } = renderHook(() => useLocalStorage("local-storage-test", "fallback"));

    expect(result.current[0]).toBe("fallback");

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(localStorage.getItem("local-storage-test")).toBe("\"updated\"");
  });

  test("reloads when the storage key changes", () => {
    localStorage.setItem("local-storage-test:b", JSON.stringify("stored"));

    const { result, rerender } = renderHook(
      ({ storageKey }) => useLocalStorage(storageKey, "fallback"),
      { initialProps: { storageKey: "local-storage-test:a" } },
    );

    expect(result.current[0]).toBe("fallback");

    rerender({ storageKey: "local-storage-test:b" });

    expect(result.current[0]).toBe("stored");
  });
});
