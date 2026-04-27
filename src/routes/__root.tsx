import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { type } from "@tauri-apps/plugin-os";
import classNames from "classnames";
import { Provider as JotaiProvider } from "jotai";
import { lazy, Suspense } from "react";
import { GlobalHooks } from "../components/GlobalHooks";
import RouteError from "../components/RouteError";
import { I18nProvider } from "../lib/i18n";
import { jotaiStore } from "../lib/jotai";
import { queryClient } from "../lib/queryClient";

const Toasts = lazy(() =>
  import("../components/Toasts").then((m) => ({ default: m.Toasts })),
);
const Dialogs = lazy(() =>
  import("../components/Dialogs").then((m) => ({ default: m.Dialogs })),
);

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: RouteError,
});

function RouteComponent() {
  return (
    <JotaiProvider store={jotaiStore}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <Suspense>
            <Toasts />
            <Dialogs />
          </Suspense>
          <Layout />
          <GlobalHooks />
        </I18nProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}

function Layout() {
  return (
    <div
      className={classNames(
        "w-full h-full",
        type() === "linux" && "border border-border-subtle",
      )}
    >
      <Outlet />
    </div>
  );
}
