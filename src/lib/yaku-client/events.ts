export const yakuEventNames = {
  runEvent: "yaku://run-event",
  runUpdated: "yaku://run-updated",
  runBodyRecorded: "yaku://run-body-recorded",
} as const;

export type YakuEventName = (typeof yakuEventNames)[keyof typeof yakuEventNames];
