import { workspacesAtom } from "@yakumo-internal/models";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { Heading } from "./core/Heading";
import { Link } from "./core/Link";
import { getRecentCookieJars } from "../hooks/useRecentCookieJars";
import { getRecentEnvironments } from "../hooks/useRecentEnvironments";
import { getRecentRequests } from "../hooks/useRecentRequests";
import { useRecentWorkspaces } from "../hooks/useRecentWorkspaces";
import { fireAndForget } from "../lib/fireAndForget";
import { router } from "../lib/router";

export function RedirectToLatestWorkspace() {
  const workspaces = useAtomValue(workspacesAtom);
  const recentWorkspaces = useRecentWorkspaces();

  useEffect(() => {
    if (workspaces.length === 0 || recentWorkspaces == null) {
      console.log("No workspaces found to redirect to. Skipping.", {
        workspaces,
        recentWorkspaces,
      });
      return;
    }

    fireAndForget(
      (async () => {
        const workspaceId = recentWorkspaces[0] ?? workspaces[0]?.id ?? "n/a";
        const environmentId = (await getRecentEnvironments(workspaceId))[0] ?? null;
        const cookieJarId = (await getRecentCookieJars(workspaceId))[0] ?? null;
        const requestId = (await getRecentRequests(workspaceId))[0] ?? null;
        const params = { workspaceId };
        const search = {
          cookie_jar_id: cookieJarId,
          environment_id: environmentId,
          request_id: requestId,
        };

        console.log("Redirecting to workspace", params, search);
        await router.navigate({ to: "/workspaces/$workspaceId", params, search });
      })(),
    );
  }, [recentWorkspaces, workspaces, workspaces.length]);

  if (recentWorkspaces == null) {
    return null;
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-highlight/40 p-6">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-text-subtlest">
            Yakumo Launchpad
          </div>
          <Heading level={2} className="mb-2">
            No legacy workspaces loaded
          </Heading>
          <p className="mb-4 text-sm leading-6 text-text-subtle">
            旧模型仓库当前没有可跳转的 workspace。可以先进入新的 V2 Inspector，直接查看
            `v2.sqlite` 里的 workspace、request、run 和 body 数据。
          </p>
          <Link
            href="/v2"
            noUnderline
            className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text"
          >
            Open V2 Inspector
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
