// Vitest setup file for the desktop (refine) project
// Keep this lightweight and non-invasive; individual tests will mock modules as needed.

// Ensure TextEncoder/TextDecoder exist in the JSDOM test environment
import { TextEncoder, TextDecoder } from "util";

// @ts-ignore
if (!(globalThis as any).TextEncoder) {
  // @ts-ignore
  (globalThis as any).TextEncoder = TextEncoder;
}
// @ts-ignore
if (!(globalThis as any).TextDecoder) {
  // @ts-ignore
  (globalThis as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Ensure crypto API exists (Node provides webcrypto via node:crypto)
try {
  // Dynamically import to avoid issues in environments that already provide crypto
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require("node:crypto");
  if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = nodeCrypto.webcrypto;
  }
} catch {
  // Ignore if unavailable; most Node versions used by Vitest provide crypto
}
