/**
 * Comprehensive Logging Service
 * 
 * This service provides structured logging for all OAuth flow steps,
 * configurable log levels based on environment, and performance monitoring
 * for authentication flows.
 */

import { Environment } from '../types/environment';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
  error?: Error;
  duration?: number;
  correlationId?: string;
}

/**
 * Performance measurement interface
 */
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  enablePerformanceTracking: boolean;
  enableOAuthFlowTracking: boolean;
  sensitiveFields: string[];
}

/**
 * Comprehensive Logging Service
 */
export class LoggingService {
  private config: LoggingConfig;
  private logs: LogEntry[] = [];
  private performanceMeasurements: Map<string, PerformanceMeasurement> = new Map();

  private correlationId: string | null = null;

  constructor(environment: Environment) {
    this.config = this.getDefaultConfig(environment);
    this.setupGlobalErrorHandling();
  }

  /**
   * Get default configuration based on environment
   */
  private getDefaultConfig(environment: Environment): LoggingConfig {
    const isDevelopment = environment === 'development';
    
    return {
      level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStoredLogs: isDevelopment ? 1000 : 500,
      enablePerformanceTracking: true,
      enableOAuthFlowTracking: true,
      sensitiveFields: [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'clientId',
        'clientSecret',
        'accessToken',
        'refreshToken',
        'authCode',
        'codeVerifier'
      ]
    };
  }

  /**
   * Update logging configuration
   */
  updateConfig(updates: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.log(LogLevel.INFO, 'LOGGING', 'Configuration updated', { config: this.config });
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Clear correlation ID
   */
  clearCorrelationId(): void {
    this.correlationId = null;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, any>,
    error?: Error,
    duration?: number
  ): void {
    // Check if log level is enabled
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      error,
      duration,
      correlationId: this.correlationId || undefined
    };

    // Store log entry
    if (this.config.enableStorage) {
      this.logs.unshift(entry);
      
      // Trim logs if exceeding max
      if (this.logs.length > this.config.maxStoredLogs) {
        this.logs = this.logs.slice(0, this.config.maxStoredLogs);
      }
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Debug level logging
   */
  debug(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Info level logging
   */
  info(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Warning level logging
   */
  warn(category: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Error level logging
   */
  error(category: string, message: string, error?: Error, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  /**
   * Start performance measurement
   */
  startPerformanceMeasurement(name: string, metadata?: Record<string, any>): void {
    if (!this.config.enablePerformanceTracking) {
      return;
    }

    const measurement: PerformanceMeasurement = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.performanceMeasurements.set(name, measurement);
    this.debug('PERFORMANCE', `Started measuring: ${name}`, metadata);
  }

  /**
   * End performance measurement
   */
  endPerformanceMeasurement(name: string, metadata?: Record<string, any>): number | null {
    if (!this.config.enablePerformanceTracking) {
      return null;
    }

    const measurement = this.performanceMeasurements.get(name);
    if (!measurement) {
      this.warn('PERFORMANCE', `No measurement found for: ${name}`);
      return null;
    }

    measurement.endTime = performance.now();
    measurement.duration = measurement.endTime - measurement.startTime;

    if (metadata) {
      measurement.metadata = { ...measurement.metadata, ...metadata };
    }

    this.info('PERFORMANCE', `Completed measurement: ${name}`, {
      duration: measurement.duration,
      ...measurement.metadata
    });

    this.performanceMeasurements.delete(name);
    return measurement.duration;
  }



  /**
   * Log authentication attempt
   */
  logAuthAttempt(method: 'oauth' | 'manual' | 'token', data?: Record<string, any>): void {
    this.info('AUTH', `Authentication attempt: ${method}`, data);
  }

  /**
   * Log authentication success
   */
  logAuthSuccess(method: 'oauth' | 'manual' | 'token', duration?: number, data?: Record<string, any>): void {
    this.info('AUTH', `Authentication successful: ${method}`, {
      duration,
      ...data
    });
  }

  /**
   * Log authentication failure
   */
  logAuthFailure(method: 'oauth' | 'manual' | 'token', error: string | Error, data?: Record<string, any>): void {
    this.error('AUTH', `Authentication failed: ${method}`, error instanceof Error ? error : undefined, {
      errorMessage: error instanceof Error ? error.message : error,
      ...data
    });
  }

  /**
   * Log deep link event
   */
  logDeepLinkEvent(event: 'received' | 'processed' | 'failed', url?: string, data?: Record<string, any>): void {
    this.info('DEEP_LINK', `Deep link ${event}`, {
      url: url ? this.sanitizeUrl(url) : undefined,
      ...data
    });
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, url: string, data?: Record<string, any>): void {
    this.debug('API', `${method} ${url}`, data);
  }

  /**
   * Log API response
   */
  logApiResponse(method: string, url: string, status: number, duration?: number, data?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, 'API', `${method} ${url} - ${status}`, {
      status,
      duration,
      ...data
    }, undefined, duration);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level);
    }
    
    return filteredLogs.slice(0, count);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string, count: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.category === category)
      .slice(0, count);
  }

  /**
   * Get OAuth flow logs
   */
  getOAuthFlowLogs(flowId?: string): LogEntry[] {
    if (flowId) {
      return this.logs.filter(log => log.correlationId === flowId);
    }
    
    return this.logs.filter(log => log.category === 'OAUTH_FLOW');
  }

  /**
   * Export logs as JSON
   */
  exportLogs(options?: { 
    includeData?: boolean; 
    includeErrors?: boolean; 
    maxCount?: number;
    categories?: string[];
  }): string {
    const opts = {
      includeData: true,
      includeErrors: true,
      maxCount: 1000,
      categories: undefined,
      ...options
    };

    let logsToExport = this.logs.slice(0, opts.maxCount);
    
    if (opts.categories) {
      logsToExport = logsToExport.filter(log => opts.categories!.includes(log.category));
    }

    const exportData = logsToExport.map(log => ({
      timestamp: new Date(log.timestamp).toISOString(),
      level: LogLevel[log.level],
      category: log.category,
      message: log.message,
      data: opts.includeData ? log.data : undefined,
      error: opts.includeErrors && log.error ? {
        message: log.error.message,
        stack: log.error.stack
      } : undefined,
      duration: log.duration,
      correlationId: log.correlationId
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    this.logs = [];
    this.info('LOGGING', 'Log history cleared');
  }

  /**
   * Get logging statistics
   */
  getStatistics(): Record<string, any> {
    const stats = {
      totalLogs: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      activePerformanceMeasurements: this.performanceMeasurements.size
    };

    // Count by level
    for (const log of this.logs) {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
    }

    // Count by category
    for (const log of this.logs) {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.config.sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive && typeof value === 'string') {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'code', 'state', 'client_secret'];
      for (const param of sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      }
      
      return urlObj.toString();
    } catch {
      return '[INVALID_URL]';
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`;
    
    const message = entry.correlationId 
      ? `${prefix} [${entry.correlationId}] ${entry.message}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.error || entry.data);
        break;
    }
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    // This would be called from the main app initialization
    // to capture unhandled errors and promise rejections
  }
}

/**
 * Create logging service instance based on environment
 */
export const createLoggingService = (environment: Environment): LoggingService => {
  return new LoggingService(environment);
};

// Export singleton instance (will be initialized by the app)
let loggingServiceInstance: LoggingService | null = null;

export const initializeLogging = (environment: Environment): LoggingService => {
  if (!loggingServiceInstance) {
    loggingServiceInstance = new LoggingService(environment);
  }
  return loggingServiceInstance;
};

export const getLoggingService = (): LoggingService => {
  if (!loggingServiceInstance) {
    throw new Error('Logging service not initialized. Call initializeLogging() first.');
  }
  return loggingServiceInstance;
};