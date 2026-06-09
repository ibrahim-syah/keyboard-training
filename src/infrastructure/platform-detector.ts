import type { PlatformInfo } from '../domain/types.ts';

/**
 * Detects the user's platform by inspecting the browser's navigator object.
 * Handles SSR environments where navigator may be undefined.
 *
 * @returns PlatformInfo with isMacOS boolean and raw userAgent string
 */
export function detectPlatform(): PlatformInfo {
  if (typeof navigator === 'undefined') {
    return { isMacOS: false, userAgent: '' };
  }

  const userAgent = navigator.userAgent;
  const isMacOS = /Mac|Macintosh/.test(userAgent);

  return { isMacOS, userAgent };
}
