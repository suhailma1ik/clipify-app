import React from "react";
import { useHotkeyPermission } from "../hooks";
import { getShortcutLabel } from "../utils/platform";

interface HotkeyPermissionManagerProps {
  onPermissionGranted?: () => void;
  onShortcutRegistered?: () => void;
}

export const HotkeyPermissionManager: React.FC<
  HotkeyPermissionManagerProps
> = ({ onPermissionGranted, onShortcutRegistered }) => {
  const {
    permissionStatus,
    isLoading,
    error,
    requestPermissions,
    registerShortcut,
    refreshStatus,
  } = useHotkeyPermission();

  const handleGrantPermissions = async () => {
    await requestPermissions();
    if (onPermissionGranted) {
      onPermissionGranted();
    }
  };

  const handleRegisterShortcut = async () => {
    await registerShortcut();
    if (onShortcutRegistered) {
      onShortcutRegistered();
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return "⏳";
    if (error) return "❌";
    if (permissionStatus?.shortcut_registered) return "✅";
    if (permissionStatus?.accessibility_granted) return "🔐";
    return "⚠️";
  };

  const getStatusMessage = () => {
    if (isLoading) return "Checking permissions...";
    if (error) return `Error: ${error}`;
    if (!permissionStatus) return "Unable to check permission status";

    if (permissionStatus.shortcut_registered) {
      return `Global shortcut ${getShortcutLabel()} is active and ready!`;
    }

    if (
      permissionStatus.accessibility_granted &&
      permissionStatus.can_register_shortcut
    ) {
      return "Accessibility permissions granted. Click to register shortcut.";
    }

    if (permissionStatus.needs_restart) {
      return "Permissions may have been granted. Please restart the app to activate the shortcut.";
    }

    if (permissionStatus.error_message) {
      return permissionStatus.error_message;
    }

    return `Accessibility permissions required for global shortcut ${getShortcutLabel()}`;
  };

  const getActionButton = () => {
    if (isLoading) {
      return (
        <button disabled style={styles.button}>
          Checking...
        </button>
      );
    }

    if (!permissionStatus) {
      return (
        <button onClick={refreshStatus} style={styles.button}>
          Retry Check
        </button>
      );
    }

    if (permissionStatus.shortcut_registered) {
      return (
        <button onClick={refreshStatus} style={styles.successButton}>
          Refresh Status
        </button>
      );
    }

    if (
      permissionStatus.accessibility_granted &&
      permissionStatus.can_register_shortcut
    ) {
      return (
        <button onClick={handleRegisterShortcut} style={styles.button}>
          Register Shortcut
        </button>
      );
    }

    if (permissionStatus.needs_restart) {
      return (
        <div style={styles.restartContainer}>
          <button onClick={refreshStatus} style={styles.button}>
            Check Again
          </button>
          <p style={styles.restartText}>
            If permissions were granted, please restart the app
          </p>
        </div>
      );
    }

    return (
      <button onClick={handleGrantPermissions} style={styles.button}>
        Grant Permissions
      </button>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>{getStatusIcon()}</span>
        <div style={styles.content}>
          <h3 style={styles.title}>Global Shortcut Status</h3>
          <p style={styles.message}>{getStatusMessage()}</p>
        </div>
      </div>
      <div style={styles.actions}>{getActionButton()}</div>
      {permissionStatus?.accessibility_granted &&
        !permissionStatus.shortcut_registered && (
          <div style={styles.instructions}>
            <p style={styles.instructionText}>
              ℹ️ Once the shortcut is registered, you can use {" "}
              <strong>{getShortcutLabel()}</strong> to copy and clean selected text
              anywhere on your system.
            </p>
          </div>
        )}
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
    marginBottom: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "15px",
  },
  icon: {
    fontSize: "24px",
    marginRight: "15px",
    minWidth: "30px",
  },
  content: {
    flex: 1,
  },
  title: {
    margin: "0 0 5px 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  message: {
    margin: 0,
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.4",
  },
  actions: {
    marginTop: "15px",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  successButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  restartContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    gap: "10px",
  },
  restartText: {
    margin: 0,
    fontSize: "12px",
    color: "#666",
    fontStyle: "italic",
  },
  instructions: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#e7f3ff",
    borderRadius: "5px",
    border: "1px solid #b3d9ff",
  },
  instructionText: {
    margin: 0,
    fontSize: "13px",
    color: "#0066cc",
  },
};
