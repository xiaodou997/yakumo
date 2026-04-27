import type { LucideIcon } from "lucide-react";
import type { SVGProps } from "react";
import { useEffect, useState } from "react";

type IconModule = {
  default: LucideIcon;
};

const iconLoaders: Record<string, () => Promise<IconModule>> = {
  "alarm-clock": () => import("lucide-react/dist/esm/icons/alarm-clock.js"),
  "triangle-alert": () => import("lucide-react/dist/esm/icons/triangle-alert.js"),
  archive: () => import("lucide-react/dist/esm/icons/archive.js"),
  "arrow-big-down-dash": () => import("lucide-react/dist/esm/icons/arrow-big-down-dash.js"),
  "arrow-big-left-dash": () => import("lucide-react/dist/esm/icons/arrow-big-left-dash.js"),
  "arrow-big-right": () => import("lucide-react/dist/esm/icons/arrow-big-right.js"),
  "arrow-big-right-dash": () => import("lucide-react/dist/esm/icons/arrow-big-right-dash.js"),
  "arrow-big-up-dash": () => import("lucide-react/dist/esm/icons/arrow-big-up-dash.js"),
  "arrow-down": () => import("lucide-react/dist/esm/icons/arrow-down.js"),
  "arrow-down-to-dot": () => import("lucide-react/dist/esm/icons/arrow-down-to-dot.js"),
  "arrow-down-to-line": () => import("lucide-react/dist/esm/icons/arrow-down-to-line.js"),
  "arrow-left": () => import("lucide-react/dist/esm/icons/arrow-left.js"),
  "arrow-right": () => import("lucide-react/dist/esm/icons/arrow-right.js"),
  "circle-arrow-right": () => import("lucide-react/dist/esm/icons/circle-arrow-right.js"),
  "arrow-up": () => import("lucide-react/dist/esm/icons/arrow-up.js"),
  "arrow-up-down": () => import("lucide-react/dist/esm/icons/arrow-up-down.js"),
  "arrow-up-from-dot": () => import("lucide-react/dist/esm/icons/arrow-up-from-dot.js"),
  "arrow-up-from-line": () => import("lucide-react/dist/esm/icons/arrow-up-from-line.js"),
  "badge-check": () => import("lucide-react/dist/esm/icons/badge-check.js"),
  "book-open-text": () => import("lucide-react/dist/esm/icons/book-open-text.js"),
  box: () => import("lucide-react/dist/esm/icons/box.js"),
  cake: () => import("lucide-react/dist/esm/icons/cake.js"),
  "message-square": () => import("lucide-react/dist/esm/icons/message-square.js"),
  "circle-check-big": () => import("lucide-react/dist/esm/icons/circle-check-big.js"),
  "square-check": () => import("lucide-react/dist/esm/icons/square-check.js"),
  square: () => import("lucide-react/dist/esm/icons/square.js"),
  "chevron-left": () => import("lucide-react/dist/esm/icons/chevron-left.js"),
  "chevrons-down-up": () => import("lucide-react/dist/esm/icons/chevrons-down-up.js"),
  "chevrons-up-down": () => import("lucide-react/dist/esm/icons/chevrons-up-down.js"),
  "circle-alert": () => import("lucide-react/dist/esm/icons/circle-alert.js"),
  "circle-dashed": () => import("lucide-react/dist/esm/icons/circle-dashed.js"),
  "circle-dollar-sign": () => import("lucide-react/dist/esm/icons/circle-dollar-sign.js"),
  "circle-fading-arrow-up": () =>
    import("lucide-react/dist/esm/icons/circle-fading-arrow-up.js"),
  "circle-off": () => import("lucide-react/dist/esm/icons/circle-off.js"),
  clock: () => import("lucide-react/dist/esm/icons/clock.js"),
  code: () => import("lucide-react/dist/esm/icons/code.js"),
  command: () => import("lucide-react/dist/esm/icons/command.js"),
  cookie: () => import("lucide-react/dist/esm/icons/cookie.js"),
  "copy-check": () => import("lucide-react/dist/esm/icons/copy-check.js"),
  "corner-right-down": () => import("lucide-react/dist/esm/icons/corner-right-down.js"),
  "corner-right-up": () => import("lucide-react/dist/esm/icons/corner-right-up.js"),
  "credit-card": () => import("lucide-react/dist/esm/icons/credit-card.js"),
  crosshair: () => import("lucide-react/dist/esm/icons/crosshair.js"),
  dot: () => import("lucide-react/dist/esm/icons/dot.js"),
  download: () => import("lucide-react/dist/esm/icons/download.js"),
  ellipsis: () => import("lucide-react/dist/esm/icons/ellipsis.js"),
  "ellipsis-vertical": () => import("lucide-react/dist/esm/icons/ellipsis-vertical.js"),
  expand: () => import("lucide-react/dist/esm/icons/expand.js"),
  "external-link": () => import("lucide-react/dist/esm/icons/external-link.js"),
  eye: () => import("lucide-react/dist/esm/icons/eye.js"),
  "eye-off": () => import("lucide-react/dist/esm/icons/eye-off.js"),
  file: () => import("lucide-react/dist/esm/icons/file.js"),
  "file-code": () => import("lucide-react/dist/esm/icons/file-code.js"),
  "file-text": () => import("lucide-react/dist/esm/icons/file-text.js"),
  filter: () => import("lucide-react/dist/esm/icons/filter.js"),
  flame: () => import("lucide-react/dist/esm/icons/flame.js"),
  "flask-conical": () => import("lucide-react/dist/esm/icons/flask-conical.js"),
  folder: () => import("lucide-react/dist/esm/icons/folder.js"),
  "folder-code": () => import("lucide-react/dist/esm/icons/folder-code.js"),
  "folder-cog": () => import("lucide-react/dist/esm/icons/folder-cog.js"),
  "folder-down": () => import("lucide-react/dist/esm/icons/folder-down.js"),
  "folder-git": () => import("lucide-react/dist/esm/icons/folder-git.js"),
  "folder-input": () => import("lucide-react/dist/esm/icons/folder-input.js"),
  "folder-open": () => import("lucide-react/dist/esm/icons/folder-open.js"),
  "folder-output": () => import("lucide-react/dist/esm/icons/folder-output.js"),
  "folder-symlink": () => import("lucide-react/dist/esm/icons/folder-symlink.js"),
  "folder-sync": () => import("lucide-react/dist/esm/icons/folder-sync.js"),
  "folder-up": () => import("lucide-react/dist/esm/icons/folder-up.js"),
  gift: () => import("lucide-react/dist/esm/icons/gift.js"),
  "git-branch": () => import("lucide-react/dist/esm/icons/git-branch.js"),
  "git-branch-plus": () => import("lucide-react/dist/esm/icons/git-branch-plus.js"),
  "git-commit": () => import("lucide-react/dist/esm/icons/git-commit.js"),
  "git-commit-vertical": () => import("lucide-react/dist/esm/icons/git-commit-vertical.js"),
  "git-fork": () => import("lucide-react/dist/esm/icons/git-fork.js"),
  "git-pull-request": () => import("lucide-react/dist/esm/icons/git-pull-request.js"),
  globe: () => import("lucide-react/dist/esm/icons/globe.js"),
  "grip-vertical": () => import("lucide-react/dist/esm/icons/grip-vertical.js"),
  hand: () => import("lucide-react/dist/esm/icons/hand.js"),
  "hard-drive-download": () => import("lucide-react/dist/esm/icons/hard-drive-download.js"),
  "circle-help": () => import("lucide-react/dist/esm/icons/circle-help.js"),
  history: () => import("lucide-react/dist/esm/icons/history.js"),
  house: () => import("lucide-react/dist/esm/icons/house.js"),
  import: () => import("lucide-react/dist/esm/icons/import.js"),
  info: () => import("lucide-react/dist/esm/icons/info.js"),
  "key-round": () => import("lucide-react/dist/esm/icons/key-round.js"),
  keyboard: () => import("lucide-react/dist/esm/icons/keyboard.js"),
  lock: () => import("lucide-react/dist/esm/icons/lock.js"),
  "lock-open": () => import("lucide-react/dist/esm/icons/lock-open.js"),
  merge: () => import("lucide-react/dist/esm/icons/merge.js"),
  minus: () => import("lucide-react/dist/esm/icons/minus.js"),
  "circle-minus": () => import("lucide-react/dist/esm/icons/circle-minus.js"),
  moon: () => import("lucide-react/dist/esm/icons/moon.js"),
  palette: () => import("lucide-react/dist/esm/icons/palette.js"),
  "clipboard-paste": () => import("lucide-react/dist/esm/icons/clipboard-paste.js"),
  pencil: () => import("lucide-react/dist/esm/icons/pencil.js"),
  pin: () => import("lucide-react/dist/esm/icons/pin.js"),
  plug: () => import("lucide-react/dist/esm/icons/plug.js"),
  plus: () => import("lucide-react/dist/esm/icons/plus.js"),
  puzzle: () => import("lucide-react/dist/esm/icons/puzzle.js"),
  "refresh-cw": () => import("lucide-react/dist/esm/icons/refresh-cw.js"),
  rocket: () => import("lucide-react/dist/esm/icons/rocket.js"),
  "rotate-ccw": () => import("lucide-react/dist/esm/icons/rotate-ccw.js"),
  save: () => import("lucide-react/dist/esm/icons/save.js"),
  "send-horizontal": () => import("lucide-react/dist/esm/icons/send-horizontal.js"),
  settings: () => import("lucide-react/dist/esm/icons/settings.js"),
  shield: () => import("lucide-react/dist/esm/icons/shield.js"),
  "shield-alert": () => import("lucide-react/dist/esm/icons/shield-alert.js"),
  "shield-check": () => import("lucide-react/dist/esm/icons/shield-check.js"),
  "shield-off": () => import("lucide-react/dist/esm/icons/shield-off.js"),
  sparkles: () => import("lucide-react/dist/esm/icons/sparkles.js"),
  "square-terminal": () => import("lucide-react/dist/esm/icons/square-terminal.js"),
  sun: () => import("lucide-react/dist/esm/icons/sun.js"),
  table: () => import("lucide-react/dist/esm/icons/table.js"),
  "trash-2": () => import("lucide-react/dist/esm/icons/trash-2.js"),
  "pin-off": () => import("lucide-react/dist/esm/icons/pin-off.js"),
  "refresh-ccw": () => import("lucide-react/dist/esm/icons/refresh-ccw.js"),
  upload: () => import("lucide-react/dist/esm/icons/upload.js"),
  variable: () => import("lucide-react/dist/esm/icons/variable.js"),
  wifi: () => import("lucide-react/dist/esm/icons/wifi.js"),
  wrench: () => import("lucide-react/dist/esm/icons/wrench.js"),
};

interface Props extends SVGProps<SVGSVGElement> {
  name: string;
}

export function LazyLucideIcon({ name, ...props }: Props) {
  const [Component, setComponent] = useState<LucideIcon | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = iconLoaders[name] ?? iconLoaders["shield-alert"]!;

    loader()
      .then((module) => {
        if (!cancelled) {
          setComponent(() => module.default);
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (Component == null) {
    return (
      <span
        className={props.className}
        aria-hidden={props["aria-hidden"]}
        style={{ ...props.style, display: "inline-block" }}
      />
    );
  }

  return <Component {...props} />;
}
