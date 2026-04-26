import { changeModelStoreWorkspace } from "@yakumo-internal/models";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface Props {
  children: ReactNode;
  loadGlobalModels?: () => Promise<void>;
}

type StartupState =
  | { type: "loading" }
  | { type: "ready" }
  | { type: "error"; error: unknown };

const defaultLoadGlobalModels = () => changeModelStoreWorkspace(null);
let globalModelsPromise: Promise<void> | null = null;

function loadGlobalModelsOnce(loadGlobalModels: () => Promise<void>): Promise<void> {
  if (loadGlobalModels !== defaultLoadGlobalModels) {
    return loadGlobalModels();
  }

  globalModelsPromise ??= loadGlobalModels().catch((error) => {
    globalModelsPromise = null;
    throw error;
  });

  return globalModelsPromise;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function StartupGate({ children, loadGlobalModels = defaultLoadGlobalModels }: Props) {
  const [state, setState] = useState<StartupState>({ type: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ type: "loading" });

    loadGlobalModelsOnce(loadGlobalModels).then(
      () => {
        if (!cancelled) {
          setState({ type: "ready" });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ type: "error", error });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [loadGlobalModels, attempt]);

  if (state.type === "ready") {
    return children;
  }

  if (state.type === "error") {
    return (
      <main className="h-full flex items-center justify-center bg-surface text-text">
        <div className="w-[min(36rem,calc(100vw-2rem))]">
          <h1 className="text-xl font-semibold mb-3">Unable to start Yaak</h1>
          <pre className="mb-4 cursor-text select-auto font-mono text-sm w-full bg-surface-highlight p-3 rounded whitespace-pre-wrap border border-danger border-dashed overflow-x-auto">
            {getErrorMessage(state.error)}
          </pre>
          <button
            type="button"
            className="x-theme-button x-theme-button--solid x-theme-button--solid--primary border border-transparent h-md px-3 rounded-md"
            onClick={() => {
              setAttempt((value) => value + 1);
            }}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full flex items-center justify-center bg-surface text-text">
      <div className="flex items-center gap-3 text-text-subtle" role="status">
        <div className="h-4 w-4 animate-spin border-[0.13rem] border-[currentColor] border-b-transparent rounded-full" />
        <span>Loading Yaak...</span>
      </div>
    </main>
  );
}
