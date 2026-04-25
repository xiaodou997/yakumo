import type { HttpRequestHeader } from "@yakumo-internal/models";
import { invokeCmd } from "./tauri";

/**
 * Global default headers fetched from the backend.
 * These are static and fetched once on module load.
 */
export const defaultHeaders: HttpRequestHeader[] = await invokeCmd("cmd_default_headers");
