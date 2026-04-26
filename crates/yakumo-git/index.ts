import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { createFastMutation } from "@yakumo/app/hooks/useFastMutation";
import { queryClient } from "@yakumo/app/lib/queryClient";
import { useMemo } from "react";
import {
  BranchDeleteResult,
  CloneResult,
  GitCommit,
  GitRemote,
  GitStatusSummary,
  PullResult,
  PushResult,
} from "./bindings/gen_git";
import { showToast } from "@yakumo/app/lib/toast";

export * from "./bindings/gen_git";
export * from "./bindings/gen_models";

export interface GitCredentials {
  username: string;
  password: string;
}

export type DivergedStrategy = "force_reset" | "merge" | "cancel";

export type UncommittedChangesStrategy = "reset" | "cancel";

export interface GitCallbacks {
  addRemote: () => Promise<GitRemote | null>;
  promptCredentials: (
    result: Extract<PushResult, { type: "needs_credentials" }>,
  ) => Promise<GitCredentials | null>;
  promptDiverged: (result: Extract<PullResult, { type: "diverged" }>) => Promise<DivergedStrategy>;
  promptUncommittedChanges: () => Promise<UncommittedChangesStrategy>;
  forceSync: () => Promise<void>;
}

const onSuccess = () => queryClient.invalidateQueries({ queryKey: ["git"] });

export function useGit(workspaceId: string, callbacks: GitCallbacks, refreshKey?: string) {
  const mutations = useMemo(() => gitMutations(workspaceId, callbacks), [workspaceId, callbacks]);
  const fetchAll = useQuery<void, string>({
    queryKey: ["git", "fetch_all", workspaceId, refreshKey],
    queryFn: () => invoke("cmd_git_workspace_fetch_all", { workspaceId }),
    refetchInterval: 10 * 60_000,
  });
  return [
    {
      remotes: useQuery<GitRemote[], string>({
        queryKey: ["git", "remotes", workspaceId, refreshKey],
        queryFn: () => getRemotes(workspaceId),
        placeholderData: (prev) => prev,
      }),
      log: useQuery<GitCommit[], string>({
        queryKey: ["git", "log", workspaceId, refreshKey],
        queryFn: () => invoke("cmd_git_workspace_log", { workspaceId }),
        placeholderData: (prev) => prev,
      }),
      status: useQuery<GitStatusSummary, string>({
        refetchOnMount: true,
        queryKey: ["git", "status", workspaceId, refreshKey, fetchAll.dataUpdatedAt],
        queryFn: () => invoke("cmd_git_workspace_status", { workspaceId }),
        placeholderData: (prev) => prev,
      }),
    },
    mutations,
  ] as const;
}

export const gitMutations = (workspaceId: string, callbacks: GitCallbacks) => {
  const push = async () => {
    const remotes = await getRemotes(workspaceId);
    if (remotes.length === 0) {
      const remote = await callbacks.addRemote();
      if (remote == null) throw new Error("No remote found");
    }

    const result = await invoke<PushResult>("cmd_git_workspace_push", { workspaceId });
    if (result.type !== "needs_credentials") return result;

    // Needs credentials, prompt for them
    const creds = await callbacks.promptCredentials(result);
    if (creds == null) throw new Error("Canceled");

    await invoke("cmd_git_add_credential", {
      remoteUrl: result.url,
      username: creds.username,
      password: creds.password,
    });

    // Push again
    return invoke<PushResult>("cmd_git_workspace_push", { workspaceId });
  };

  const handleError = (err: unknown) => {
    showToast({
      id: err instanceof Error ? err.message : String(err),
      message: err instanceof Error ? err.message : String(err),
      color: "danger",
      timeout: 5000,
    });
  };

  return {
    init: createFastMutation<void, string, void>({
      mutationKey: ["git", "init"],
      mutationFn: () => invoke("cmd_git_workspace_initialize", { workspaceId }),
      onSuccess,
    }),
    add: createFastMutation<void, string, { relaPaths: string[] }>({
      mutationKey: ["git", "add", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_add", { workspaceId, ...args }),
      onSuccess,
    }),
    addRemote: createFastMutation<GitRemote, string, GitRemote>({
      mutationKey: ["git", "add-remote"],
      mutationFn: (args) => invoke("cmd_git_workspace_add_remote", { workspaceId, ...args }),
      onSuccess,
    }),
    rmRemote: createFastMutation<void, string, { name: string }>({
      mutationKey: ["git", "rm-remote", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_rm_remote", { workspaceId, ...args }),
      onSuccess,
    }),
    createBranch: createFastMutation<void, string, { branch: string; base?: string }>({
      mutationKey: ["git", "branch", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_branch", { workspaceId, ...args }),
      onSuccess,
    }),
    mergeBranch: createFastMutation<void, string, { branch: string }>({
      mutationKey: ["git", "merge", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_merge_branch", { workspaceId, ...args }),
      onSuccess,
    }),
    deleteBranch: createFastMutation<
      BranchDeleteResult,
      string,
      { branch: string; force?: boolean }
    >({
      mutationKey: ["git", "delete-branch", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_delete_branch", { workspaceId, ...args }),
      onSuccess,
    }),
    deleteRemoteBranch: createFastMutation<void, string, { branch: string }>({
      mutationKey: ["git", "delete-remote-branch", workspaceId],
      mutationFn: (args) =>
        invoke("cmd_git_workspace_delete_remote_branch", { workspaceId, ...args }),
      onSuccess,
    }),
    renameBranch: createFastMutation<void, string, { oldName: string; newName: string }>({
      mutationKey: ["git", "rename-branch", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_rename_branch", { workspaceId, ...args }),
      onSuccess,
    }),
    checkout: createFastMutation<string, string, { branch: string; force: boolean }>({
      mutationKey: ["git", "checkout", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_checkout", { workspaceId, ...args }),
      onSuccess,
    }),
    commit: createFastMutation<void, string, { message: string }>({
      mutationKey: ["git", "commit", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_commit", { workspaceId, ...args }),
      onSuccess,
    }),
    commitAndPush: createFastMutation<PushResult, string, { message: string }>({
      mutationKey: ["git", "commit_push", workspaceId],
      mutationFn: async (args) => {
        await invoke("cmd_git_workspace_commit", { workspaceId, ...args });
        return push();
      },
      onSuccess,
    }),

    push: createFastMutation<PushResult, string, void>({
      mutationKey: ["git", "push", workspaceId],
      mutationFn: push,
      onSuccess,
    }),
    pull: createFastMutation<PullResult, string, void>({
      mutationKey: ["git", "pull", workspaceId],
      async mutationFn() {
        const result = await invoke<PullResult>("cmd_git_workspace_pull", { workspaceId });

        if (result.type === "needs_credentials") {
          const creds = await callbacks.promptCredentials(result);
          if (creds == null) throw new Error("Canceled");

          await invoke("cmd_git_add_credential", {
            remoteUrl: result.url,
            username: creds.username,
            password: creds.password,
          });

          // Pull again after credentials
          return invoke<PullResult>("cmd_git_workspace_pull", { workspaceId });
        }

        if (result.type === "uncommitted_changes") {
          void callbacks
            .promptUncommittedChanges()
            .then(async (strategy) => {
              if (strategy === "cancel") return;

              await invoke("cmd_git_workspace_reset_changes", { workspaceId });
              return invoke<PullResult>("cmd_git_workspace_pull", { workspaceId });
            })
            .then(async () => {
              await onSuccess();
              await callbacks.forceSync();
            }, handleError);
        }

        if (result.type === "diverged") {
          void callbacks
            .promptDiverged(result)
            .then((strategy) => {
              if (strategy === "cancel") return;

              if (strategy === "force_reset") {
                return invoke<PullResult>("cmd_git_workspace_pull_force_reset", {
                  workspaceId,
                  remote: result.remote,
                  branch: result.branch,
                });
              }

              return invoke<PullResult>("cmd_git_workspace_pull_merge", {
                workspaceId,
                remote: result.remote,
                branch: result.branch,
              });
            })
            .then(async () => {
              await onSuccess();
              await callbacks.forceSync();
            }, handleError);
        }

        return result;
      },
      onSuccess,
    }),
    unstage: createFastMutation<void, string, { relaPaths: string[] }>({
      mutationKey: ["git", "unstage", workspaceId],
      mutationFn: (args) => invoke("cmd_git_workspace_unstage", { workspaceId, ...args }),
      onSuccess,
    }),
    resetChanges: createFastMutation<void, string, void>({
      mutationKey: ["git", "reset-changes", workspaceId],
      mutationFn: () => invoke("cmd_git_workspace_reset_changes", { workspaceId }),
      onSuccess,
    }),
  } as const;
};

async function getRemotes(workspaceId: string) {
  return invoke<GitRemote[]>("cmd_git_workspace_remotes", { workspaceId });
}

/**
 * Clone a git repository, prompting for credentials if needed.
 */
export async function gitClone(
  url: string,
  dir: string,
  promptCredentials: (args: {
    url: string;
    error: string | null;
  }) => Promise<GitCredentials | null>,
): Promise<CloneResult> {
  const result = await invoke<CloneResult>("cmd_git_clone", { url, dir });
  if (result.type !== "needs_credentials") return result;

  // Prompt for credentials
  const creds = await promptCredentials({ url: result.url, error: result.error });
  if (creds == null) return { type: "cancelled" };

  // Store credentials and retry
  await invoke("cmd_git_add_credential", {
    remoteUrl: result.url,
    username: creds.username,
    password: creds.password,
  });

  return invoke<CloneResult>("cmd_git_clone", { url, dir });
}
