import type { Color } from "@yakumo/features";
import classNames from "classnames";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Columns2Icon,
  CopyIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusCircleIcon,
  Rows2Icon,
  SearchIcon,
  ShieldAlertIcon,
  Wand2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, CSSProperties, SVGProps } from "react";
import { memo, useEffect, useState } from "react";

const syncIcons = {
  check: CheckIcon,
  chevron_down: ChevronDownIcon,
  chevron_right: ChevronRightIcon,
  columns_2: Columns2Icon,
  copy: CopyIcon,
  left_panel_hidden: PanelLeftOpenIcon,
  left_panel_visible: PanelLeftCloseIcon,
  magic_wand: Wand2Icon,
  plus_circle: PlusCircleIcon,
  rows_2: Rows2Icon,
  search: SearchIcon,
  x: XIcon,
  _unknown: ShieldAlertIcon,
} satisfies Record<string, LucideIcon>;

const lazyIconNames = {
  alarm_clock: "alarm-clock",
  alert_triangle: "triangle-alert",
  archive: "archive",
  arrow_big_down_dash: "arrow-big-down-dash",
  arrow_big_left_dash: "arrow-big-left-dash",
  arrow_big_right: "arrow-big-right",
  arrow_big_right_dash: "arrow-big-right-dash",
  arrow_big_up_dash: "arrow-big-up-dash",
  arrow_down: "arrow-down",
  arrow_down_to_dot: "arrow-down-to-dot",
  arrow_down_to_line: "arrow-down-to-line",
  arrow_left: "arrow-left",
  arrow_right: "arrow-right",
  arrow_right_circle: "circle-arrow-right",
  arrow_up: "arrow-up",
  arrow_up_down: "arrow-up-down",
  arrow_up_from_dot: "arrow-up-from-dot",
  arrow_up_from_line: "arrow-up-from-line",
  badge_check: "badge-check",
  book_open_text: "book-open-text",
  box: "box",
  cake: "cake",
  chat: "message-square",
  check_circle: "circle-check-big",
  check_square_checked: "square-check",
  check_square_unchecked: "square",
  chevron_left: "chevron-left",
  chevrons_down_up: "chevrons-down-up",
  chevrons_up_down: "chevrons-up-down",
  circle_alert: "circle-alert",
  circle_dashed: "circle-dashed",
  circle_dollar_sign: "circle-dollar-sign",
  circle_fading_arrow_up: "circle-fading-arrow-up",
  circle_off: "circle-off",
  clock: "clock",
  code: "code",
  command: "command",
  cookie: "cookie",
  copy_check: "copy-check",
  corner_right_down: "corner-right-down",
  corner_right_up: "corner-right-up",
  credit_card: "credit-card",
  crosshair: "crosshair",
  dot: "dot",
  download: "download",
  ellipsis: "ellipsis",
  ellipsis_vertical: "ellipsis-vertical",
  expand: "expand",
  external_link: "external-link",
  eye: "eye",
  eye_closed: "eye-off",
  file: "file",
  file_code: "file-code",
  file_text: "file-text",
  filter: "filter",
  flame: "flame",
  flask: "flask-conical",
  folder: "folder",
  folder_code: "folder-code",
  folder_cog: "folder-cog",
  folder_down: "folder-down",
  folder_git: "folder-git",
  folder_input: "folder-input",
  folder_open: "folder-open",
  folder_output: "folder-output",
  folder_symlink: "folder-symlink",
  folder_sync: "folder-sync",
  folder_up: "folder-up",
  gift: "gift",
  git_branch: "git-branch",
  git_branch_plus: "git-branch-plus",
  git_commit: "git-commit",
  git_commit_vertical: "git-commit-vertical",
  git_fork: "git-fork",
  git_pull_request: "git-pull-request",
  globe: "globe",
  grip_vertical: "grip-vertical",
  hand: "hand",
  hard_drive_download: "hard-drive-download",
  help: "circle-help",
  history: "history",
  house: "house",
  import: "import",
  info: "info",
  key_round: "key-round",
  keyboard: "keyboard",
  lock: "lock",
  lock_open: "lock-open",
  merge: "merge",
  minus: "minus",
  minus_circle: "circle-minus",
  moon: "moon",
  more_vertical: "ellipsis-vertical",
  palette: "palette",
  paste: "clipboard-paste",
  pencil: "pencil",
  pin: "pin",
  plug: "plug",
  plus: "plus",
  puzzle: "puzzle",
  refresh: "refresh-cw",
  rocket: "rocket",
  rotate_ccw: "rotate-ccw",
  save: "save",
  send_horizontal: "send-horizontal",
  settings: "settings",
  shield: "shield",
  shield_check: "shield-check",
  shield_off: "shield-off",
  sparkles: "sparkles",
  square_terminal: "square-terminal",
  sun: "sun",
  table: "table",
  text: "file-text",
  trash: "trash-2",
  unpin: "pin-off",
  update: "refresh-ccw",
  upload: "upload",
  variable: "variable",
  wifi: "wifi",
  wrench: "wrench",
} as const;

type LazyIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    name: string;
  }
>;

let lazyIconComponent: LazyIconComponent | null = null;
let lazyIconPromise: Promise<LazyIconComponent> | null = null;
const lazyIconListeners = new Set<() => void>();

function loadLazyIconComponent() {
  lazyIconPromise ??= import("./LazyLucideIcon").then((m) => {
    lazyIconComponent = m.LazyLucideIcon;
    for (const listener of lazyIconListeners) {
      listener();
    }
    return m.LazyLucideIcon;
  });

  return lazyIconPromise;
}

function useLazyIconComponent(enabled: boolean) {
  const [component, setComponent] = useState<LazyIconComponent | null>(() => lazyIconComponent);

  useEffect(() => {
    if (!enabled || component != null) return;

    const listener = () => setComponent(() => lazyIconComponent);
    lazyIconListeners.add(listener);
    loadLazyIconComponent().catch(console.error);
    return () => {
      lazyIconListeners.delete(listener);
    };
  }, [component, enabled]);

  return component;
}

type SyncIconName = keyof typeof syncIcons;
type LazyIconName = keyof typeof lazyIconNames;

export type IconName = SyncIconName | LazyIconName | "empty";

export interface IconProps {
  icon: IconName;
  className?: string;
  style?: CSSProperties;
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  spin?: boolean;
  title?: string;
  color?: Color | "custom" | "default";
}

export const Icon = memo(function Icon({
  icon,
  color = "default",
  spin,
  size = "md",
  style,
  className,
  title,
}: IconProps) {
  const SyncComponent = icon === "empty" ? null : syncIcons[icon as SyncIconName];
  const lazyIconName =
    SyncComponent == null && icon !== "empty"
      ? (lazyIconNames[icon as LazyIconName] ?? "shield-alert")
      : null;
  const LazyComponent = useLazyIconComponent(lazyIconName != null);
  const finalClassName = classNames(
    className,
    !spin && "transform-gpu",
    spin && "animate-spin",
    "flex-shrink-0",
    size === "xl" && "h-6 w-6",
    size === "lg" && "h-5 w-5",
    size === "md" && "h-4 w-4",
    size === "sm" && "h-3.5 w-3.5",
    size === "xs" && "h-3 w-3",
    size === "2xs" && "h-2.5 w-2.5",
    color === "default" && "inherit",
    color === "danger" && "text-danger",
    color === "warning" && "text-warning",
    color === "notice" && "text-notice",
    color === "info" && "text-info",
    color === "success" && "text-success",
    color === "primary" && "text-primary",
    color === "secondary" && "text-secondary",
  );

  if (icon === "empty") {
    return (
      <span
        style={style}
        title={title}
        className={classNames(finalClassName, "inline-block")}
      />
    );
  }

  if (SyncComponent != null) {
    return (
      <SyncComponent
        style={style}
        aria-label={title}
        className={finalClassName}
        aria-hidden={!title}
      />
    );
  }

  if (LazyComponent != null && lazyIconName != null) {
    return (
      <LazyComponent
        name={lazyIconName}
        style={style}
        aria-label={title}
        aria-hidden={!title}
        className={finalClassName}
      />
    );
  }

  return (
    <span
      aria-hidden={!title}
      style={style}
      title={title}
      className={classNames(finalClassName, "inline-block")}
    />
  );
});
