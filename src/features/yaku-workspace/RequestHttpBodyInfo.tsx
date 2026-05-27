export function RequestHttpBodyInfo({ mode }: { mode: "file" | "multipart" | "text" | "json" }) {
  if (mode === "file") {
    return (
      <div className="mt-2 text-[11px] text-text-subtle">
        File body is read at send time. The path is stored in request config;
        file contents are not.
      </div>
    );
  }
  if (mode === "multipart") {
    return (
      <div className="mt-2 text-[11px] text-text-subtle">
        File parts are read at send time. File contents are not stored in
        request config.
      </div>
    );
  }
  return null;
}
