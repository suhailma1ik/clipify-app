/**
 * Diagnostic Service
 * 
 * This service collects comprehensive diagnostic information for troubleshooting
 * production issues, including environment configuration, system information,
 * and runtime state.
 */

import { Environment } from '../types/environment';

/**
 * System information interface
 */
export interface SystemInfo {
  platform: string;
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  cookieEnabled: boolean;
  onlineStatus: boolean;
  connectionType?: string;
}

/**
 * Runtime diagnostics interface
 */
export interface RuntimeDiagnostics {
  isTauri: boolean;
  tauriVersion?: string;
  appVersion?: string;
  buildTime?: string;
  uptime: number;
  memoryUsage?: any; // MemoryInfo type not available in all environments
  performanceMetrics: PerformanceMetrics;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}

/**
 * Network diagnostics interface
 */
export interface NetworkDiagnostics {
  onlineStatus: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Error information interface
 */
export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Comprehensive diagnostic report interface
 */
export interface DiagnosticReport {
  timestamp: number;
  environment: Environment;
  systemInfo: SystemInfo;
  runtimeDiagnostics: RuntimeDiagnostics;
  networkDiagnostics: NetworkDiagnostics;
  recentErrors: ErrorInfo[];
  customData?: Record<string, any>;
}

/**
 * Diagnostic collection options
 */
export interface DiagnosticOptions {
  includeSystemInfo?: boolean;
  includeNetworkInfo?: boolean;
  includePerformanceMetrics?: boolean;
  includeRecentErrors?: boolean;
  maxErrorCount?: number;
  customDataCollector?: () => Record<string, any>;
}

/**
 * Diagnostic Service
 */
export class DiagnosticService {
  private recentErrors: ErrorInfo[] = [];
  private readonly maxErrorHistory = 50;
  private startTime = Date.now();

  constructor() {
    // Set up global error tracking
    this.setupErrorTracking();
  }

  /**
   * Collect comprehensive diagnostic information
   */
  async collectDiagnostics(options: DiagnosticOptions = {}): Promise<DiagnosticReport> {
    console.log('[DiagnosticService] Collecting comprehensive diagnostics');
    
    const opts: Required<DiagnosticOptions> = {
      includeSystemInfo: true,
      includeNetworkInfo: true,
      includePerformanceMetrics: true,
      includeRecentErrors: true,
      maxErrorCount: 10,
      customDataCollector: () => ({}),
      ...options
    };

    try {
      const report: DiagnosticReport = {
        timestamp: Date.now(),
        environment: this.detectEnvironment(),
        systemInfo: opts.includeSystemInfo ? this.collectSystemInfo() : {} as SystemInfo,
        runtimeDiagnostics: this.collectRuntimeDiagnostics(opts.includePerformanceMetrics),
        networkDiagnostics: opts.includeNetworkInfo ? this.collectNetworkDiagnostics() : {} as NetworkDiagnostics,
        recentErrors: opts.includeRecentErrors ? this.getRecentErrors(opts.maxErrorCount) : []
      };



      // Collect custom data if provided
      if (opts.customDataCollector) {
        try {
          report.customData = opts.customDataCollector();
        } catch (error) {
          console.warn('[DiagnosticService] Failed to collect custom data:', error);
        }
      }

      console.log('[DiagnosticService] Diagnostic collection completed');
      return report;
    } catch (error) {
      console.error('[DiagnosticService] Failed to collect diagnostics:', error);
      
      // Return minimal report on failure
      return {
        timestamp: Date.now(),
        environment: this.detectEnvironment(),
        systemInfo: {} as SystemInfo,
        runtimeDiagnostics: this.collectRuntimeDiagnostics(false),
        networkDiagnostics: {} as NetworkDiagnostics,
        recentErrors: [{
          message: `Diagnostic collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        }]
      };
    }
  }

  /**
   * Collect system information
   */
  private collectSystemInfo(): SystemInfo {
    try {
      const nav = navigator;
      const screen = window.screen;
      
      return {
        platform: nav.platform || 'Unknown',
        userAgent: nav.userAgent || 'Unknown',
        language: nav.language || 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth || 0,
        cookieEnabled: nav.cookieEnabled || false,
        onlineStatus: nav.onLine || false,
        connectionType: this.getConnectionType()
      };
    } catch (error) {
      console.warn('[DiagnosticService] Failed to collect system info:', error);
      return {
        platform: 'Unknown',
        userAgent: 'Unknown',
        language: 'Unknown',
        timezone: 'Unknown',
        screenResolution: 'Unknown',
        colorDepth: 0,
        cookieEnabled: false,
        onlineStatus: false
      };
    }
  }

  /**
   * Collect runtime diagnostics
   */
  private collectRuntimeDiagnostics(includePerformanceMetrics: boolean): RuntimeDiagnostics {
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
      
      const diagnostics: RuntimeDiagnostics = {
        isTauri,
        uptime: Date.now() - this.startTime,
        performanceMetrics: includePerformanceMetrics ? this.collectPerformanceMetrics() : {} as PerformanceMetrics
      };

      // Add Tauri-specific information
      if (isTauri) {
        try {
          // In a real implementation, you would get this from Tauri APIs
          diagnostics.tauriVersion = 'Unknown'; // Would use __TAURI__.version or similar
          diagnostics.appVersion = import.meta.env.VITE_APP_VERSION || 'Unknown';
          diagnostics.buildTime = import.meta.env.VITE_BUILD_TIME || 'Unknown';
        } catch (error) {
          console.warn('[DiagnosticService] Failed to collect Tauri info:', error);
        }
      }

      // Add memory usage if available
      if ('memory' in performance) {
        diagnostics.memoryUsage = (performance as any).memory;
      }

      return diagnostics;
    } catch (error) {
      console.warn('[DiagnosticService] Failed to collect runtime diagnostics:', error);
      return {
        isTauri: false,
        uptime: Date.now() - this.startTime,
        performanceMetrics: {} as PerformanceMetrics
      };
    }
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): PerformanceMetrics {
    try {
      const timing = performance.timing;
      // const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics: PerformanceMetrics = {
        navigationStart: timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart
      };

      // Add paint metrics if available
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-paint') {
          metrics.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      }

      return metrics;
    } catch (error) {
      console.warn('[DiagnosticService] Failed to collect performance metrics:', error);
      return {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0
      };
    }
  }

  /**
   * Collect network diagnostics
   */
  private collectNetworkDiagnostics(): NetworkDiagnostics {
    try {
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      const diagnostics: NetworkDiagnostics = {
        onlineStatus: nav.onLine || false
      };

      if (connection) {
        diagnostics.connectionType = connection.type;
        diagnostics.effectiveType = connection.effectiveType;
        diagnostics.downlink = connection.downlink;
        diagnostics.rtt = connection.rtt;
        diagnostics.saveData = connection.saveData;
      }

      return diagnostics;
    } catch (error) {
      console.warn('[DiagnosticService] Failed to collect network diagnostics:', error);
      return {
        onlineStatus: false
      };
    }
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string | undefined {
    try {
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      return connection?.type || connection?.effectiveType;
    } catch {
      return undefined;
    }
  }

  /**
   * Set up global error tracking
   */
  private setupErrorTracking(): void {
    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.addError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        timestamp: Date.now(),
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript-error'
        }
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        context: {
          reason: event.reason,
          type: 'unhandled-rejection'
        }
      });
    });
  }

  /**
   * Add error to history
   */
  addError(error: ErrorInfo): void {
    this.recentErrors.unshift(error);
    
    // Keep only the most recent errors
    if (this.recentErrors.length > this.maxErrorHistory) {
      this.recentErrors = this.recentErrors.slice(0, this.maxErrorHistory);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(maxCount: number = 10): ErrorInfo[] {
    return this.recentErrors.slice(0, maxCount);
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.recentErrors = [];
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): Environment {
    const viteEnv = import.meta.env.VITE_ENVIRONMENT;
    if (viteEnv === 'production' || viteEnv === 'development') {
      return viteEnv;
    }

    const nodeEnv = import.meta.env.NODE_ENV;
    if (nodeEnv === 'production') {
      return 'production';
    }

    const mode = import.meta.env.MODE;
    if (mode === 'production') {
      return 'production';
    }

    return 'development';
  }

  /**
   * Export diagnostics as JSON string
   */
  async exportDiagnostics(options?: DiagnosticOptions): Promise<string> {
    const report = await this.collectDiagnostics(options);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export diagnostics for support
   */
  async exportForSupport(): Promise<string> {
    const report = await this.collectDiagnostics({
      includeSystemInfo: true,
      includeNetworkInfo: true,
      includePerformanceMetrics: false, // Skip for privacy
      includeRecentErrors: true,
      maxErrorCount: 5
    });

    // Sanitize sensitive information
    const sanitizedReport = this.sanitizeForSupport(report);
    
    return JSON.stringify(sanitizedReport, null, 2);
  }

  /**
   * Sanitize diagnostic report for support sharing
   */
  private sanitizeForSupport(report: DiagnosticReport): DiagnosticReport {
    const sanitized = { ...report };





    // Remove potentially sensitive custom data
    if (sanitized.customData) {
      delete sanitized.customData;
    }

    return sanitized;
  }
}

// Export singleton instance
export const diagnosticService = new DiagnosticService();