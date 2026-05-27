import { fieldClassName } from "./RequestFieldPrimitives";

export function RequestHttpBodyModeSection({
  mode,
  setMode,
}: {
  mode: "text" | "json" | "file" | "multipart";
  setMode: (value: string) => void;
}) {
  return (
    <select
      value={mode}
      onChange={(event) => setMode(event.target.value)}
      className={`${fieldClassName} w-auto min-w-32`}
    >
      <option value="text">Text</option>
      <option value="json">JSON</option>
      <option value="file">File</option>
      <option value="multipart">Multipart</option>
    </select>
  );
}
