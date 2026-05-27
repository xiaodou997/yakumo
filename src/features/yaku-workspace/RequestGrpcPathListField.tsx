import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "../../components/core/Button";
import { VStack } from "../../components/core/Stacks";
import { textareaClassName } from "./RequestFieldPrimitives";
import { EmptyCopy } from "./WorkspacePanels";
import {
  joinPathLines,
  normalizeDialogPaths,
  splitNonEmptyLines,
} from "./RequestGrpcDiscoveryModel";

export function PathListField({
  title,
  description,
  value,
  setValue,
  placeholder,
  browseLabel,
  noun,
  directory = false,
  fileExtensions = [],
}: {
  title: string;
  description: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  browseLabel: string;
  noun: string;
  directory?: boolean;
  fileExtensions?: string[];
}) {
  const paths = splitNonEmptyLines(value);

  const browse = async () => {
    const selected = await open({
      title: directory ? "Select Folder" : "Select Files",
      directory,
      multiple: true,
      filters:
        directory || fileExtensions.length === 0
          ? undefined
          : [{ name: noun, extensions: fileExtensions }],
    });
    const nextPaths = normalizeDialogPaths(selected);
    if (nextPaths.length === 0) {
      return;
    }
    setValue(joinPathLines(paths.concat(nextPaths)));
  };

  const removePath = (target: string) => {
    setValue(joinPathLines(paths.filter((path) => path !== target)));
  };

  const clearAll = () => {
    setValue("");
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
            {title}
          </div>
          <div className="mt-1 text-xs text-text-subtle">{description}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="2xs" variant="border" onClick={browse}>
            {browseLabel}
          </Button>
          <Button
            size="2xs"
            variant="border"
            color="danger"
            disabled={paths.length === 0}
            onClick={clearAll}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {paths.length === 0 ? (
          <EmptyCopy>No {noun.toLowerCase()} paths selected.</EmptyCopy>
        ) : (
          paths.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-highlight/30 px-2 py-2"
            >
              <div className="min-w-0 flex-1 break-all font-mono text-[11px] text-text">
                {path}
              </div>
              <Button
                size="2xs"
                variant="border"
                color="danger"
                onClick={() => removePath(path)}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={Math.max(3, Math.min(6, paths.length || 3))}
        placeholder={placeholder}
        className={`${textareaClassName} mt-3`}
      />
    </div>
  );
}
