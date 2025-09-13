// Cross-platform platform utilities
// Provides helpers to render OS-specific shortcut labels consistently

export const isMac = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform || "";
  return /Mac|Macintosh|Mac OS X/.test(ua) || /Mac/.test(platform);
};

export const getPrimaryModifierKey = (): string => (isMac() ? "Cmd" : "Ctrl");

export const getShortcutLabel = (): string => `${getPrimaryModifierKey()}+Shift+C`;
