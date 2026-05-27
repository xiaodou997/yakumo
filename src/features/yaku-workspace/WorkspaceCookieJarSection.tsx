import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/core/Button";
import { VStack } from "../../components/core/Stacks";
import { listYakuCookies, type YakuCookieJar } from "../../lib/yaku-client";
import { fieldClassName } from "./RequestFieldPrimitives";
import { FieldLabel } from "./WorkspacePanels";
import { WorkspaceCookieJarList } from "./WorkspaceCookieJarList";

export function WorkspaceCookieJarSection({
  selectedWorkspaceId,
  cookieJars,
  cookieJarName,
  setCookieJarName,
  isCreatingCookieJar,
  isClearingCookieJar,
  isDeletingCookie,
  deletingCookieId,
  isDeletingCookieJar,
  onCreateCookieJar,
  onClearCookieJar,
  onDeleteCookie,
  onDeleteCookieJar,
}: {
  selectedWorkspaceId: string | null | undefined;
  cookieJars: YakuCookieJar[];
  cookieJarName: string;
  setCookieJarName: (value: string) => void;
  isCreatingCookieJar: boolean;
  isClearingCookieJar: boolean;
  isDeletingCookie: boolean;
  deletingCookieId: string;
  isDeletingCookieJar: boolean;
  onCreateCookieJar: () => void;
  onClearCookieJar: (jarId: string) => void;
  onDeleteCookie: (jarId: string, cookieId: string) => Promise<unknown>;
  onDeleteCookieJar: (jarId: string) => void;
}) {
  const [expandedCookieJarId, setExpandedCookieJarId] = useState("");
  const expandedCookieJar = cookieJars.find((jar) => jar.id === expandedCookieJarId) ?? null;
  const cookiesQuery = useQuery({
    enabled: expandedCookieJar != null,
    queryKey: ["yaku", "cookies", expandedCookieJarId],
    queryFn: () => listYakuCookies(expandedCookieJarId),
    placeholderData: (prev) => prev,
  });

  return (
    <form
      className="rounded-xl border border-border-subtle bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onCreateCookieJar();
      }}
    >
      <VStack space={2}>
        <FieldLabel htmlFor="yaku-cookie-jar-name">Cookie Jars</FieldLabel>
        <input
          id="yaku-cookie-jar-name"
          value={cookieJarName}
          onChange={(event) => setCookieJarName(event.target.value)}
          className={fieldClassName}
        />
        <Button
          size="xs"
          type="submit"
          disabled={selectedWorkspaceId == null}
          isLoading={isCreatingCookieJar}
        >
          Create Cookie Jar
        </Button>
        <VStack space={2}>
          {cookieJars.length === 0 ? (
            <div className="text-xs leading-5 text-text-subtle">
              No cookie jars in this workspace.
            </div>
          ) : (
            cookieJars.map((jar) => (
              <div
                key={jar.id}
                className="rounded-lg border border-border-subtle bg-surface-highlight/40 px-2 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-text">{jar.name}</div>
                    <div className="truncate text-[11px] text-text-subtlest">{jar.id}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="xs"
                      type="button"
                      variant="border"
                      onClick={() =>
                        setExpandedCookieJarId((current: string) => (current === jar.id ? "" : jar.id))
                      }
                    >
                      {expandedCookieJarId === jar.id ? "Hide" : "Inspect"}
                    </Button>
                    <Button
                      size="xs"
                      type="button"
                      variant="border"
                      isLoading={isClearingCookieJar}
                      onClick={() => onClearCookieJar(jar.id)}
                    >
                      Clear
                    </Button>
                    <Button
                      size="xs"
                      type="button"
                      variant="border"
                      color="danger"
                      isLoading={isDeletingCookieJar}
                      onClick={() => {
                        setExpandedCookieJarId((current: string) => (current === jar.id ? "" : current));
                        onDeleteCookieJar(jar.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {expandedCookieJarId === jar.id ? (
                  <WorkspaceCookieJarList
                    jarId={jar.id}
                    cookies={cookiesQuery.data ?? []}
                    isLoading={cookiesQuery.isFetching}
                    isDeletingCookie={isDeletingCookie}
                    deletingCookieId={deletingCookieId}
                    error={cookiesQuery.error}
                    onDeleteCookie={onDeleteCookie}
                  />
                ) : null}
              </div>
            ))
          )}
        </VStack>
      </VStack>
    </form>
  );
}
