import classNames from "classnames";
import { Button } from "../../components/core/Button";
import { Heading } from "../../components/core/Heading";
import { HStack, VStack } from "../../components/core/Stacks";

export function YakuWorkspaceHeroSection({
  workspacesCount,
  requestsCount,
  runsCount,
  latestState,
  canStartRun,
  canCancelRun,
  isStartingRun,
  isCancellingRun,
  onStartRun,
  onCancelRun,
}: {
  workspacesCount: number;
  requestsCount: number;
  runsCount: number;
  latestState: string;
  canStartRun: boolean;
  canCancelRun: boolean;
  isStartingRun: boolean;
  isCancellingRun: boolean;
  onStartRun: () => void;
  onCancelRun: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-highlight/60 px-5 py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]"
      />
      <VStack space={4} className="relative">
        <HStack justifyContent="between" alignItems="start" className="gap-4 max-md:flex-col">
          <VStack space={2} className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.28em] text-text-subtlest">
              Yaku
            </div>
            <Heading level={1}>Workspace</Heading>
            <p className="max-w-2xl text-sm leading-6 text-text-subtle">
              Yaku-first workspace shell backed by yaku.sqlite, domain services, and the
              event-driven run lifecycle. This path no longer depends on the legacy AnyModel
              workspace surface.
            </p>
          </VStack>
          <HStack space={2} wrap className="shrink-0">
            <Button
              color="default"
              isLoading={isStartingRun}
              disabled={!canStartRun}
              onClick={onStartRun}
            >
              Send Selected Request
            </Button>
            <Button
              color="danger"
              variant="border"
              isLoading={isCancellingRun}
              disabled={!canCancelRun}
              onClick={onCancelRun}
            >
              Cancel Run
            </Button>
          </HStack>
        </HStack>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Workspaces" value={String(workspacesCount)} />
          <StatCard label="Requests" value={String(requestsCount)} />
          <StatCard label="Runs" value={String(runsCount)} />
          <StatCard
            label="Latest State"
            value={latestState}
            accent={latestState === "completed" ? "success" : latestState === "failed" ? "danger" : "default"}
          />
        </div>
      </VStack>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-text-subtlest">{label}</div>
      <div
        className={classNames(
          "mt-2 text-2xl font-semibold",
          accent === "default" && "text-text",
          accent === "success" && "text-success",
          accent === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}
