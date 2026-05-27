import { fieldClassName } from "./RequestFieldPrimitives";
import type { YakuProtocol } from "../../lib/yaku-client";

export function RequestEditorUrlField({
  protocol,
  url,
  setUrl,
}: {
  protocol: YakuProtocol;
  url: string;
  setUrl: (value: string) => void;
}) {
  return (
    <input
      value={url}
      onChange={(event) => setUrl(event.target.value)}
      placeholder={
        protocol === "web_socket"
          ? "ws://example.com/socket"
          : "https://example.com"
      }
      className={fieldClassName}
    />
  );
}
