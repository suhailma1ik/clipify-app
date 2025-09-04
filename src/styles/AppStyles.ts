import { CSSProperties } from "react";

export type NotificationType = "success" | "error" | "info";

export const COLORS = {
  primary: "#3d71ec",
  primaryDark: "#2f5ed1",
  primaryLight: "#e7efff",
  white: "#ffffff",
  text: "#2d3748",
  muted: "#718096",
} as const;

export const appStyles = {
  mainContainer: {
    background: COLORS.white,
    minHeight: "100vh",
    padding: "24px",
    overflow: "hidden",
  } as CSSProperties,

  card: {
    background: COLORS.white,
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "1px solid #edf2f7",
  } as CSSProperties,

  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } as CSSProperties,

  rowCenter: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as CSSProperties,

  rowGap8: {
    display: "flex",
    gap: "8px",
  } as CSSProperties,

  rowGap12: {
    display: "flex",
    gap: "12px",
  } as CSSProperties,

  iconBox: {
    background: COLORS.white,
    borderRadius: "10px",
    padding: "8px",
    border: `1px solid ${COLORS.primaryLight}`,
    boxShadow: "0 3px 10px rgba(61, 113, 236, 0.15)",
  } as CSSProperties,

  h3Title: {
    margin: 0,
    color: COLORS.text,
    fontSize: "18px",
    fontWeight: 700,
  } as CSSProperties,

  h4Title: {
    margin: 0,
    color: COLORS.text,
    fontSize: "16px",
    fontWeight: 600,
  } as CSSProperties,

  mutedText: {
    margin: 0,
    color: COLORS.muted,
    fontSize: "14px",
  } as CSSProperties,

  input: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "12px",
    boxSizing: "border-box",
  } as CSSProperties,

  notificationCloseButton: {
    background: "none",
    border: "none",
    color: COLORS.white,
    marginLeft: "auto",
    cursor: "pointer",
    fontSize: "16px",
    opacity: 0.8,
  } as CSSProperties,

  iconSmall: {
    fontSize: "16px",
  } as CSSProperties,

  iconLarge: {
    fontSize: "20px",
  } as CSSProperties,

  monospaceBlock: {
    background: "#f8f9fa",
    border: "2px solid #e9ecef",
    borderRadius: "8px",
    padding: "16px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#495057",
    maxHeight: "200px",
    overflowY: "auto",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  } as CSSProperties,

  grid: (twoCols: boolean): CSSProperties => ({
    display: "grid",
    gridTemplateColumns: twoCols ? "1fr 1fr" : "1fr",
    gap: "20px",
  }),
} as const;

export const buttons = {
  primary: (opts?: { large?: boolean; disabled?: boolean }): CSSProperties => ({
    padding: opts?.large ? "12px 20px" : "8px 16px",
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: opts?.large ? "10px" : "8px",
    cursor: opts?.disabled ? "not-allowed" : "pointer",
    fontSize: "14px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 3px 10px rgba(61, 113, 236, 0.25)",
    opacity: opts?.disabled ? 0.7 : 1,
    transition: "all 0.2s ease",
  }),

  secondary: (opts?: { large?: boolean; disabled?: boolean }): CSSProperties => ({
    padding: opts?.large ? "12px 20px" : "8px 16px",
    background: COLORS.white,
    color: COLORS.text,
    border: "2px solid #e2e8f0",
    borderRadius: opts?.large ? "10px" : "8px",
    cursor: opts?.disabled ? "not-allowed" : "pointer",
    fontSize: "14px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    opacity: opts?.disabled ? 0.7 : 1,
    transition: "all 0.2s ease",
  }),

  danger: (opts?: { large?: boolean }): CSSProperties => ({
    padding: opts?.large ? "12px 20px" : "8px 16px",
    background: "#d32f2f",
    color: COLORS.white,
    border: "none",
    borderRadius: opts?.large ? "10px" : "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  }),

  smallPrimary: {
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "12px",
    cursor: "pointer",
    marginLeft: "auto",
  } as CSSProperties,
} as const;

export const badges = {
  primary: {
    background: COLORS.primaryLight,
    color: COLORS.primary,
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
  } as CSSProperties,
  success: {
    background: "#e8f5e8",
    color: "#388e3c",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 600,
  } as CSSProperties,
} as const;

export const notifications = {
  container: (type: NotificationType): CSSProperties => ({
    background:
      type === "success"
        ? "rgba(76, 175, 80, 0.9)"
        : type === "error"
        ? "rgba(244, 67, 54, 0.9)"
        : "rgba(61, 113, 236, 0.9)",
    color: COLORS.white,
    padding: "12px 20px",
    borderRadius: "8px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    animation: "slideInDown 0.3s ease",
  }),
} as const;

export const statusBox = (text: string): CSSProperties => {
  const isSuccess = text.includes("✅");
  const isError = text.includes("❌");
  const isWarn = text.includes("⚠️");
  const bg = isSuccess
    ? "rgba(76, 175, 80, 0.1)"
    : isError
    ? "rgba(244, 67, 54, 0.1)"
    : isWarn
    ? "rgba(255, 152, 0, 0.1)"
    : "rgba(61, 113, 236, 0.1)";
  const border = isSuccess
    ? "rgba(76, 175, 80, 0.3)"
    : isError
    ? "rgba(244, 67, 54, 0.3)"
    : isWarn
    ? "rgba(255, 152, 0, 0.3)"
    : "rgba(61, 113, 236, 0.3)";
  return {
    padding: "12px 16px",
    background: bg,
    borderRadius: "8px",
    border: `1px solid ${border}`,
    fontSize: "14px",
    fontWeight: 600,
    color: COLORS.text,
  };
};
