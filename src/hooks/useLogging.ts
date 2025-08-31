/**
 * Logging Hook
 * 
 * This hook provides easy access to logging functionality throughout the application,
 * with automatic context management and performance tracking.
 */

import { useCallback, useEffect, useRef } from 'react';
import { getLoggingService } from '../services/loggingService';

/**
 * Logging hook interface
 */
export interface UseLoggingReturn {
  // Basic logging methods
  debug: (category: string, message: string, data?: Record<string, any>) => void;
  info: (category: string, message: string, data?: Record<string, any>) => void;
  warn: (category: string, message: string, data?: Record<string, any>) => void;
  error: (category: string, message: string, error?: Error, data?: Record<string, any>) => void;

  // Performance tracking
  startPerformance: (name: string, metadata?: Record<string, any>) => void;
  endPerformance: (name: string, metadata?: Record<string, any>) => number | null;



  // API logging
  logApiRequest: (method: string, url: string, data?: Record<string, any>) => void;
  logApiResponse: (method: string, url: string, status: number, duration?: number, data?: Record<string, any>) => void;

  // Component lifecycle logging
  logComponentMount: (componentName: string, props?: Record<string, any>) => void;
  logComponentUnmount: (componentName: string, duration?: number) => void;
  logComponentError: (componentName: string, error: Error, errorInfo?: Record<string, any>) => void;

  // User interaction logging
  logUserAction: (action: string, data?: Record<string, any>) => void;

  // Utility methods
  setCorrelationId: (id: string) => void;
  clearCorrelationId: () => void;
  exportLogs: (options?: any) => string;
}

/**
 * Logging hook options
 */
export interface UseLoggingOptions {
  componentName?: string;
  autoTrackMount?: boolean;
  autoTrackUnmount?: boolean;
  correlationId?: string;
}

/**
 * Custom hook for logging functionality
 */
export const useLogging = (options: UseLoggingOptions = {}): UseLoggingReturn => {
  const {
    componentName,
    autoTrackMount = false,
    autoTrackUnmount = false,
    correlationId
  } = options;

  const mountTimeRef = useRef<number>(Date.now());
  const logger = getLoggingService();

  // Set correlation ID if provided
  useEffect(() => {
    if (correlationId) {
      logger.setCorrelationId(correlationId);
      return () => {
        logger.clearCorrelationId();
      };
    }
  }, [correlationId, logger]);

  // Auto-track component mount
  useEffect(() => {
    if (autoTrackMount && componentName) {
      logger.info('COMPONENT', `Component mounted: ${componentName}`);
    }
  }, [autoTrackMount, componentName, logger]);

  // Auto-track component unmount
  useEffect(() => {
    return () => {
      if (autoTrackUnmount && componentName) {
        const duration = Date.now() - mountTimeRef.current;
        logger.info('COMPONENT', `Component unmounted: ${componentName}`, { duration });
      }
    };
  }, [autoTrackUnmount, componentName, logger]);

  // Basic logging methods
  const debug = useCallback((category: string, message: string, data?: Record<string, any>) => {
    logger.debug(category, message, data);
  }, [logger]);

  const info = useCallback((category: string, message: string, data?: Record<string, any>) => {
    logger.info(category, message, data);
  }, [logger]);

  const warn = useCallback((category: string, message: string, data?: Record<string, any>) => {
    logger.warn(category, message, data);
  }, [logger]);

  const error = useCallback((category: string, message: string, errorObj?: Error, data?: Record<string, any>) => {
    logger.error(category, message, errorObj, data);
  }, [logger]);

  // Performance tracking
  const startPerformance = useCallback((name: string, metadata?: Record<string, any>) => {
    logger.startPerformanceMeasurement(name, metadata);
  }, [logger]);

  const endPerformance = useCallback((name: string, metadata?: Record<string, any>) => {
    return logger.endPerformanceMeasurement(name, metadata);
  }, [logger]);



  // API logging
  const logApiRequest = useCallback((method: string, url: string, data?: Record<string, any>) => {
    logger.logApiRequest(method, url, data);
  }, [logger]);

  const logApiResponse = useCallback((method: string, url: string, status: number, duration?: number, data?: Record<string, any>) => {
    logger.logApiResponse(method, url, status, duration, data);
  }, [logger]);

  // Component lifecycle logging
  const logComponentMount = useCallback((compName: string, props?: Record<string, any>) => {
    logger.info('COMPONENT', `Component mounted: ${compName}`, props);
  }, [logger]);

  const logComponentUnmount = useCallback((compName: string, duration?: number) => {
    logger.info('COMPONENT', `Component unmounted: ${compName}`, { duration });
  }, [logger]);

  const logComponentError = useCallback((compName: string, errorObj: Error, errorInfo?: Record<string, any>) => {
    logger.error('COMPONENT', `Component error: ${compName}`, errorObj, errorInfo);
  }, [logger]);

  // User interaction logging
  const logUserAction = useCallback((action: string, data?: Record<string, any>) => {
    logger.info('USER_ACTION', action, data);
  }, [logger]);

  // Utility methods
  const setCorrelationId = useCallback((id: string) => {
    logger.setCorrelationId(id);
  }, [logger]);

  const clearCorrelationId = useCallback(() => {
    logger.clearCorrelationId();
  }, [logger]);

  const exportLogs = useCallback((exportOptions?: any) => {
    return logger.exportLogs(exportOptions);
  }, [logger]);

  return {
    debug,
    info,
    warn,
    error,
    startPerformance,
    endPerformance,
    logApiRequest,
    logApiResponse,
    logComponentMount,
    logComponentUnmount,
    logComponentError,
    logUserAction,
    setCorrelationId,
    clearCorrelationId,
    exportLogs
  };
};



/**
 * Hook for performance logging with automatic cleanup
 */
export const usePerformanceLogging = (measurementName?: string) => {
  const logging = useLogging();
  const activeMeasurementsRef = useRef<Set<string>>(new Set());

  const start = useCallback((name?: string, metadata?: Record<string, any>) => {
    const measureName = name || measurementName;
    if (measureName) {
      logging.startPerformance(measureName, metadata);
      activeMeasurementsRef.current.add(measureName);
    }
  }, [logging, measurementName]);

  const end = useCallback((name?: string, metadata?: Record<string, any>) => {
    const measureName = name || measurementName;
    if (measureName) {
      const duration = logging.endPerformance(measureName, metadata);
      activeMeasurementsRef.current.delete(measureName);
      return duration;
    }
    return null;
  }, [logging, measurementName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // End any active measurements
      for (const name of activeMeasurementsRef.current) {
        logging.endPerformance(name, { cleanupOnUnmount: true });
      }
    };
  }, [logging]);

  return { start, end };
};