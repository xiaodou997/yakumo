import { clear, readText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useState } from "react";
import { useImportCurl } from "../hooks/useImportCurl";
import { useWindowFocus } from "../hooks/useWindowFocus";
import { Button } from "./core/Button";
import { Icon } from "./core/Icon";

export function ImportCurlButton() {
  const focused = useWindowFocus();
  const [clipboardText, setClipboardText] = useState("");

  const importCurl = useImportCurl();
  const [isLoading, setIsLoading] = useState(false);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    readText()
      .then(setClipboardText)
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
