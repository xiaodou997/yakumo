import type { ShowToastRequest } from "@yakumo/features";
import classNames from "classnames";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useDocumentKey } from "../../hooks/useDocumentKey";
import type { IconProps } from "./Icon";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { VStack } from "./Stacks";

export interface ToastProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  className?: string;
  timeout: number | null;
  action?: (args: { hide: () => void }) => ReactNode;
  icon?: ShowToastRequest["icon"] | null;
  color?: ShowToastRequest["color"];
}

const ICONS: Record<NonNullable<ToastProps["color"] | "custom">, IconProps["icon"] | null> = {
  custom: null,
  danger: "alert_triangle",
  info: "info",
  notice: "alert_triangle",
  primary: "info",
  secondary: "info",
  success: "check_circle",
  warning: "alert_triangle",
};

export function Toast({ children, open, onClose, timeout, action, icon, color }: ToastProps) {
  useDocumentKey("Escape", () => {
    if (!open) return;
    onClose();
  });

  const toastIcon = icon === null ? null : (icon ?? (color && color in ICONS && ICONS[color]));

  return (
    <div className={classNames("bg-surface m-2 rounded-lg")}>
      <div
        className={classNames(
          `x-theme-toast x-theme-toast--${color}`,
          "pointer-events-auto overflow-hidden",
          "relative pointer-events-auto bg-surface text-text rounded-lg",
          "border border-border shadow-lg w-[25rem]",
        )}
      >
        <div className="pl-3 py-3 pr-10 flex items-start gap-2 w-full max-h-[11rem] overflow-auto">
          {toastIcon && <Icon icon={toastIcon} color={color} className="mt-1 flex-shrink-0" />}
          <VStack space={2} className="w-full min-w-0">
            <div className="select-auto">{children}</div>
            {action?.({ hide: onClose })}
          </VStack>
        </div>

        <IconButton
          color={color}
          variant="border"
          className="opacity-60 border-0 !absolute top-2 right-2"
          title="Dismiss"
          icon="x"
          onClick={onClose}
        />

        {timeout != null && (
          <div className="w-full absolute bottom-0 left-0 right-0">
            <ToastProgress timeout={timeout} />
          </div>
        )}
      </div>
    </div>
  );
}

function ToastProgress({ timeout }: { timeout: number }) {
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRunning(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="bg-surface-highlight h-[3px] opacity-20"
      style={{
        width: running ? "0%" : "100%",
        transition: `width ${timeout}ms linear`,
      }}
    />
  );
}
