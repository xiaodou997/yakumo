import { Select } from "../../components/core/Select";

export function RequestBuilderParentSelector({
  parentId,
  options,
  setParentId,
}: {
  parentId: string;
  options: Array<{ label: string; value: string }>;
  setParentId: (value: string) => void;
}) {
  return (
    <Select
      name="yaku-request-parent"
      label="Parent Folder"
      value={parentId}
      options={options}
      onChange={setParentId}
    />
  );
}
