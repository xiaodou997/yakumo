export const yakuEventNames = {
  runLifecycle: "yaku_run_lifecycle",
} as const;

export type YakuEventName = (typeof yakuEventNames)[keyof typeof yakuEventNames];
