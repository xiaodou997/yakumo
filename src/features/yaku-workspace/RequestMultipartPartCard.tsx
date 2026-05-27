import { fieldClassName, textareaClassName } from "./RequestFieldPrimitives";
import { updateMultipartPart, type MultipartPart } from "./requestConfig";

export function RequestMultipartPartCard({
  parts,
  setParts,
  part,
  index,
}: {
  parts: MultipartPart[];
  setParts: (parts: MultipartPart[]) => void;
  part: MultipartPart;
  index: number;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border-subtle bg-surface-highlight/35 p-2">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem_auto_auto]">
        <input
          value={part.name}
          onChange={(event) =>
            updateMultipartPart(parts, setParts, part.id, {
              name: event.target.value,
            })
          }
          placeholder="Field name"
          className={fieldClassName}
        />
        <select
          value={part.kind}
          onChange={(event) =>
            updateMultipartPart(parts, setParts, part.id, {
              kind: event.target.value === "file" ? "file" : "text",
            })
          }
          className={fieldClassName}
        >
          <option value="text">Text</option>
          <option value="file">File</option>
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-subtle">
          <input
            type="checkbox"
            checked={part.enabled !== false}
            onChange={(event) =>
              updateMultipartPart(parts, setParts, part.id, {
                enabled: event.target.checked,
              })
            }
          />
          Enabled
        </label>
        <button
          type="button"
          onClick={() =>
            setParts(parts.filter((_, currentIndex) => currentIndex !== index))
          }
          className="rounded-md border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
        >
          Remove
        </button>
      </div>
      {part.kind === "file" ? (
        <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <input
            value={part.filePath}
            onChange={(event) =>
              updateMultipartPart(parts, setParts, part.id, {
                filePath: event.target.value,
              })
            }
            placeholder="/absolute/path/to/file"
            className={fieldClassName}
          />
          <input
            value={part.fileName}
            onChange={(event) =>
              updateMultipartPart(parts, setParts, part.id, {
                fileName: event.target.value,
              })
            }
            placeholder="Filename override"
            className={fieldClassName}
          />
          <input
            value={part.contentType}
            onChange={(event) =>
              updateMultipartPart(parts, setParts, part.id, {
                contentType: event.target.value,
              })
            }
            placeholder="Content-Type"
            className={fieldClassName}
          />
        </div>
      ) : (
        <textarea
          value={part.value}
          onChange={(event) =>
            updateMultipartPart(parts, setParts, part.id, {
              value: event.target.value,
            })
          }
          rows={2}
          placeholder="Text value"
          className={textareaClassName}
        />
      )}
    </div>
  );
}
