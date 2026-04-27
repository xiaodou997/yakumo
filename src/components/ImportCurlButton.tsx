import { useEffect, useState } from "react";
import { useWindowFocus } from "../hooks/useWindowFocus";
import { Button } from "./core/Button";
import { Icon } from "./core/Icon";

export function ImportCurlButton() {
  const focused = useWindowFocus();
  const [clipboardText, setClipboardText] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    import("@tauri-apps/plugin-clipboard-manager")
      .then(({ readText }) => readText())
      .then((text) => setClipboardText(text ?? ""))
      .catch(() => {});
  }, [focused]);

  if (!clipboardText?.trim().startsWith("curl ")) {
    return null;
  }

  return (
    <div>
      <Button
        size="2xs"
        variant="border"
        color="success"
        className="rounded-full"
        rightSlot={<Icon icon="import" size="sm" />}
        isLoading={isLoading}
        title="Import Curl command from clipboard"
        onClick={async () => {
          setIsLoading(true);
          try {
            const [{ importCurl }, { clear }] = await Promise.all([
              import("../hooks/useImportCurl"),
              import("@tauri-apps/plugin-clipboard-manager"),
            ]);
            await importCurl.mutateAsync({ command: clipboardText });
            await clear(); // Clear the clipboard so the button goes away
            setClipboardText("");
          } catch (e) {
            console.log("Failed to import curl", e);
          } finally {
            setIsLoading(false);
          }
        }}
      >
        Import Curl
      </Button>
    </div>
  );
}
