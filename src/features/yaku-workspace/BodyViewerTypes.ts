import type { YakuRunBody } from "../../lib/yaku-client";

export type BodyViewerKind = "json" | "text" | "html" | "image" | "binary";

export type BodyViewerProps = {
  bodies: YakuRunBody[];
  selectedBodyId: string;
  setSelectedBodyId: (value: string) => void;
  bodyBytes?: number[];
  isLoading?: boolean;
  error: unknown;
};

export type BodyPreviewProps = {
  body: YakuRunBody;
  bodyBytes: Uint8Array;
  imageDataUrl: string | null;
  renderedText: string;
  viewerKind: BodyViewerKind;
};
