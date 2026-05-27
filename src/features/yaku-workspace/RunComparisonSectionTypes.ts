export type EventJumpBuilder = (
  eventId: number | null,
  contextLabel: string,
) => (() => void) | null;
