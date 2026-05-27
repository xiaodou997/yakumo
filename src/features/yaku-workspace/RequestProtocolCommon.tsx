import { Button } from "../../components/core/Button";
import { VStack } from "../../components/core/Stacks";
import { fieldClassName } from "./RequestFieldPrimitives";

export function ProtocolSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-text-subtlest">
        {title}
      </div>
      <div className="mt-1 text-[11px] leading-5 text-text-subtle">
        {description}
      </div>
      <VStack space={2} className="mt-3">
        {children}
      </VStack>
    </div>
  );
}

export function StatChip({
  label,
  value,
  truncate = false,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-subtlest">
        {label}
      </div>
      <div className={`mt-1 text-xs text-text ${truncate ? "truncate" : "break-words"}`}>
        {value}
      </div>
    </div>
  );
}

export function NumberFieldWithPresets({
  label,
  value,
  onChange,
  placeholder,
  presets,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  presets: Array<{ label: string; value: string }>;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-highlight/35 p-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-subtlest">
        {label}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${fieldClassName} mt-2`}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            size="2xs"
            variant="border"
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-text-subtle">{description}</div>
    </div>
  );
}

export function TimeoutField({
  value,
  onChange,
  allowUnset = false,
  description,
}: {
  value: string;
  onChange: (value: string) => void;
  allowUnset?: boolean;
  description: string;
}) {
  const presets = allowUnset
    ? [
        { label: "Unset", value: "" },
        { label: "5s", value: "5000" },
        { label: "30s", value: "30000" },
        { label: "60s", value: "60000" },
      ]
    : [
        { label: "5s", value: "5000" },
        { label: "30s", value: "30000" },
        { label: "60s", value: "60000" },
      ];

  return (
    <NumberFieldWithPresets
      label="Timeout (ms)"
      value={value}
      onChange={onChange}
      placeholder={allowUnset ? "unset" : "30000"}
      presets={presets}
      description={description}
    />
  );
}
