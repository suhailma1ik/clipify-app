/**
 * Logging Debug Panel Component
 *
 * This component provides a debug interface for viewing logs, adjusting log levels,
 * and exporting diagnostic information during development and troubleshooting.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  getLoggingService,
  LogLevel,
  LogEntry,
} from "../services/loggingService";
import { diagnosticService } from "../services/diagnosticService";

/**
 * Logging Debug Panel Props
 */
interface LoggingDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Log level colors for UI
 */
const LOG_LEVEL_COLORS = {
  [LogLevel.DEBUG]: "#6b7280",
  [LogLevel.INFO]: "#3b82f6",
  [LogLevel.WARN]: "#f59e0b",
  [LogLevel.ERROR]: "#ef4444",
};

/**
 * Logging Debug Panel Component
 */
export const LoggingDebugPanel: React.FC<LoggingDebugPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>(LogLevel.DEBUG);
  const [maxLogs, setMaxLogs] = useState<number>(100);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [statistics, setStatistics] = useState<Record<string, any>>({});
  const [exportedLogs, setExportedLogs] = useState<string>("");
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const logger = getLoggingService();

  /**
   * Refresh logs from logging service
   */
  const refreshLogs = useCallback(() => {
    try {
      const recentLogs = logger.getRecentLogs(maxLogs, selectedLevel);

      let filteredLogs = recentLogs;
      if (selectedCategory !== "ALL") {
        filteredLogs = logger.getLogsByCategory(selectedCategory, maxLogs);
      }

      setLogs(filteredLogs);
      setStatistics(logger.getStatistics());
    } catch (error) {
      console.error("[LoggingDebugPanel] Failed to refresh logs:", error);
    }
  }, [logger, maxLogs, selectedLevel, selectedCategory]);

  /**
   * Get unique categories from logs
   */
  const getCategories = useCallback(() => {
    const categories = new Set<string>();
    categories.add("ALL");

    for (const log of logs) {
      categories.add(log.category);
    }

    return Array.from(categories).sort();
  }, [logs]);

  /**
   * Export logs
   */
  const handleExportLogs = useCallback(async () => {
    try {
      const exported = logger.exportLogs({
        includeData: true,
        includeErrors: true,
        maxCount: maxLogs,
        categories: selectedCategory !== "ALL" ? [selectedCategory] : undefined,
      });

      setExportedLogs(exported);
      setShowExportModal(true);
    } catch (error) {
      console.error("[LoggingDebugPanel] Failed to export logs:", error);
    }
  }, [logger, maxLogs, selectedCategory]);

  /**
   * Export diagnostics
   */
  const handleExportDiagnostics = useCallback(async () => {
    try {
      const diagnostics = await diagnosticService.exportForSupport();
      setExportedLogs(diagnostics);
      setShowExportModal(true);
    } catch (error) {
      console.error("[LoggingDebugPanel] Failed to export diagnostics:", error);
    }
  }, []);

  /**
   * Copy to clipboard
   */
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportedLogs);
      // Could show a notification here
    } catch (error) {
      console.error("[LoggingDebugPanel] Failed to copy to clipboard:", error);
    }
  }, [exportedLogs]);

  /**
   * Clear logs
   */
  const handleClearLogs = useCallback(() => {
    logger.clearLogs();
    refreshLogs();
  }, [logger, refreshLogs]);

  /**
   * Update log level
   */
  // const handleLogLevelChange = useCallback((level: LogLevel) => {
  //   logger.updateConfig({ level });
  //   setSelectedLevel(level);
  // }, [logger]);

  // Auto-refresh logs
  useEffect(() => {
    if (autoRefresh && isOpen) {
      const interval = setInterval(refreshLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isOpen, refreshLogs]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen, refreshLogs]);

  if (!isOpen) {
    return null;
  }

  const categories = getCategories();

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h3 style={styles.title}>Logging Debug Panel</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.controls}>
          <div style={styles.controlGroup}>
            <label style={styles.label}>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={styles.select}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Min Level:</label>
            <select
              value={selectedLevel}
              onChange={(e) =>
                setSelectedLevel(parseInt(e.target.value) as LogLevel)
              }
              style={styles.select}
            >
              <option value={LogLevel.DEBUG}>DEBUG</option>
              <option value={LogLevel.INFO}>INFO</option>
              <option value={LogLevel.WARN}>WARN</option>
              <option value={LogLevel.ERROR}>ERROR</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Max Logs:</label>
            <input
              type="number"
              value={maxLogs}
              onChange={(e) => setMaxLogs(parseInt(e.target.value) || 100)}
              style={styles.numberInput}
              min="10"
              max="1000"
            />
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto Refresh
            </label>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={refreshLogs} style={styles.button}>
            Refresh
          </button>
          <button onClick={handleExportLogs} style={styles.button}>
            Export Logs
          </button>
          <button onClick={handleExportDiagnostics} style={styles.button}>
            Export Diagnostics
          </button>
          <button onClick={handleClearLogs} style={styles.dangerButton}>
            Clear Logs
          </button>
        </div>

        <div style={styles.statistics}>
          <div style={styles.statItem}>
            <strong>Total Logs:</strong> {statistics.totalLogs || 0}
          </div>
          <div style={styles.statItem}>
            <strong>Errors:</strong> {statistics.byLevel?.ERROR || 0}
          </div>
          <div style={styles.statItem}>
            <strong>Warnings:</strong> {statistics.byLevel?.WARN || 0}
          </div>
          <div style={styles.statItem}>
            <strong>Active OAuth Flows:</strong>{" "}
            {statistics.activeOAuthFlows || 0}
          </div>
        </div>

        <div style={styles.logContainer}>
          {logs.length === 0 ? (
            <div style={styles.noLogs}>No logs to display</div>
          ) : (
            logs.map((log, index) => (
              <LogEntryComponent key={index} log={log} />
            ))
          )}
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h4>Exported Data</h4>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>

              <textarea
                value={exportedLogs}
                readOnly
                style={styles.exportTextarea}
              />

              <div style={styles.modalActions}>
                <button onClick={handleCopyToClipboard} style={styles.button}>
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={styles.button}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Log Entry Component
 */
interface LogEntryComponentProps {
  log: LogEntry;
}

const LogEntryComponent: React.FC<LogEntryComponentProps> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const levelName = LogLevel[log.level];
  const levelColor =
    LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS] || "#6b7280";

  return (
    <div style={styles.logEntry}>
      <div style={styles.logHeader} onClick={() => setExpanded(!expanded)}>
        <span style={styles.timestamp}>{timestamp}</span>
        <span style={{ ...styles.level, color: levelColor }}>{levelName}</span>
        <span style={styles.category}>{log.category}</span>
        <span style={styles.message}>{log.message}</span>
        {log.duration && (
          <span style={styles.duration}>{log.duration.toFixed(2)}ms</span>
        )}
        {log.correlationId && (
          <span style={styles.correlationId}>
            {log.correlationId.substring(0, 8)}
          </span>
        )}
      </div>

      {expanded && (log.data || log.error) && (
        <div style={styles.logDetails}>
          {log.data && (
            <div style={styles.logData}>
              <strong>Data:</strong>
              <pre style={styles.pre}>{JSON.stringify(log.data, null, 2)}</pre>
            </div>
          )}
          {log.error && (
            <div style={styles.logError}>
              <strong>Error:</strong>
              <pre style={styles.pre}>
                {log.error.stack || log.error.message}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    backgroundColor: "white",
    borderRadius: "8px",
    width: "90vw",
    height: "80vh",
    maxWidth: "1200px",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "bold",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#6b7280",
  },
  controls: {
    display: "flex",
    gap: "16px",
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
    flexWrap: "wrap" as const,
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
  },
  select: {
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
  },
  numberInput: {
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    width: "80px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
  },
  button: {
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
  },
  dangerButton: {
    padding: "8px 16px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
  },
  statistics: {
    display: "flex",
    gap: "16px",
    padding: "12px 16px",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
  },
  statItem: {
    display: "flex",
    gap: "4px",
  },
  logContainer: {
    flex: 1,
    overflow: "auto",
    padding: "8px",
  },
  noLogs: {
    textAlign: "center" as const,
    color: "#6b7280",
    padding: "32px",
    fontSize: "16px",
  },
  logEntry: {
    marginBottom: "4px",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
  },
  logHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "monospace",
    backgroundColor: "#f9fafb",
  },
  timestamp: {
    color: "#6b7280",
    minWidth: "80px",
  },
  level: {
    fontWeight: "bold",
    minWidth: "50px",
  },
  category: {
    color: "#374151",
    minWidth: "100px",
    fontWeight: "500",
  },
  message: {
    flex: 1,
    color: "#1f2937",
  },
  duration: {
    color: "#059669",
    minWidth: "60px",
    textAlign: "right" as const,
  },
  correlationId: {
    color: "#8b5cf6",
    fontSize: "10px",
    fontFamily: "monospace",
  },
  logDetails: {
    padding: "12px",
    backgroundColor: "white",
    borderTop: "1px solid #e5e7eb",
  },
  logData: {
    marginBottom: "8px",
  },
  logError: {
    color: "#dc2626",
  },
  pre: {
    fontSize: "11px",
    fontFamily: "monospace",
    margin: "4px 0 0 0",
    padding: "8px",
    backgroundColor: "#f3f4f6",
    borderRadius: "4px",
    overflow: "auto",
    maxHeight: "200px",
  },
  modal: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10001,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "8px",
    width: "80vw",
    height: "70vh",
    maxWidth: "800px",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
  },
  exportTextarea: {
    flex: 1,
    margin: "16px",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
    resize: "none" as const,
  },
  modalActions: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderTop: "1px solid #e5e7eb",
  },
};

export default LoggingDebugPanel;
