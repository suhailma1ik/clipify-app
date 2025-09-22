import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogging, usePerformanceLogging } from '../useLogging';

// Mock the logging service
const mockLoggingService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  startPerformanceMeasurement: vi.fn(),
  endPerformanceMeasurement: vi.fn(),
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
  setCorrelationId: vi.fn(),
  clearCorrelationId: vi.fn(),
  exportLogs: vi.fn(),
};

vi.mock('../../services/loggingService', () => ({
  getLoggingService: () => mockLoggingService,
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  }
}));

describe('useLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without options', () => {
      const { result } = renderHook(() => useLogging());

      expect(result.current).toHaveProperty('debug');
      expect(result.current).toHaveProperty('info');
      expect(result.current).toHaveProperty('warn');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('startPerformance');
      expect(result.current).toHaveProperty('endPerformance');
      expect(result.current).toHaveProperty('logApiRequest');
      expect(result.current).toHaveProperty('logApiResponse');
      expect(result.current).toHaveProperty('logComponentMount');
      expect(result.current).toHaveProperty('logComponentUnmount');
      expect(result.current).toHaveProperty('logComponentError');
      expect(result.current).toHaveProperty('logUserAction');
      expect(result.current).toHaveProperty('setCorrelationId');
      expect(result.current).toHaveProperty('clearCorrelationId');
      expect(result.current).toHaveProperty('exportLogs');
    });

    it('should set correlation ID on mount when provided', () => {
      const correlationId = 'test-correlation-id';
      
      renderHook(() => useLogging({ correlationId }));

      expect(mockLoggingService.setCorrelationId).toHaveBeenCalledWith(correlationId);
    });

    it('should clear correlation ID on unmount when provided', () => {
      const correlationId = 'test-correlation-id';
      
      const { unmount } = renderHook(() => useLogging({ correlationId }));
      
      unmount();

      expect(mockLoggingService.clearCorrelationId).toHaveBeenCalled();
    });

    it('should auto-track component mount when enabled', () => {
      const componentName = 'TestComponent';
      
      renderHook(() => useLogging({ 
        componentName, 
        autoTrackMount: true 
      }));

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'COMPONENT', 
        `Component mounted: ${componentName}`
      );
    });

    it('should auto-track component unmount when enabled', () => {
      const componentName = 'TestComponent';
      
      const { unmount } = renderHook(() => useLogging({ 
        componentName, 
        autoTrackUnmount: true 
      }));
      
      unmount();

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'COMPONENT', 
        `Component unmounted: ${componentName}`,
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });
  });

  describe('basic logging methods', () => {
    it('should call debug method correctly', () => {
      const { result } = renderHook(() => useLogging());
      const category = 'TEST';
      const message = 'Debug message';
      const data = { key: 'value' };

      act(() => {
        result.current.debug(category, message, data);
      });

      expect(mockLoggingService.debug).toHaveBeenCalledWith(category, message, data);
    });

    it('should call info method correctly', () => {
      const { result } = renderHook(() => useLogging());
      const category = 'TEST';
      const message = 'Info message';
      const data = { key: 'value' };

      act(() => {
        result.current.info(category, message, data);
      });

      expect(mockLoggingService.info).toHaveBeenCalledWith(category, message, data);
    });

    it('should call warn method correctly', () => {
      const { result } = renderHook(() => useLogging());
      const category = 'TEST';
      const message = 'Warning message';
      const data = { key: 'value' };

      act(() => {
        result.current.warn(category, message, data);
      });

      expect(mockLoggingService.warn).toHaveBeenCalledWith(category, message, data);
    });

    it('should call error method correctly', () => {
      const { result } = renderHook(() => useLogging());
      const category = 'TEST';
      const message = 'Error message';
      const error = new Error('Test error');
      const data = { key: 'value' };

      act(() => {
        result.current.error(category, message, error, data);
      });

      expect(mockLoggingService.error).toHaveBeenCalledWith(category, message, error, data);
    });

    it('should handle logging methods without data parameter', () => {
      const { result } = renderHook(() => useLogging());

      act(() => {
        result.current.debug('TEST', 'Debug message');
        result.current.info('TEST', 'Info message');
        result.current.warn('TEST', 'Warning message');
        result.current.error('TEST', 'Error message');
      });

      expect(mockLoggingService.debug).toHaveBeenCalledWith('TEST', 'Debug message', undefined);
      expect(mockLoggingService.info).toHaveBeenCalledWith('TEST', 'Info message', undefined);
      expect(mockLoggingService.warn).toHaveBeenCalledWith('TEST', 'Warning message', undefined);
      expect(mockLoggingService.error).toHaveBeenCalledWith('TEST', 'Error message', undefined, undefined);
    });
  });

  describe('performance tracking', () => {
    it('should start performance measurement', () => {
      const { result } = renderHook(() => useLogging());
      const name = 'test-measurement';
      const metadata = { key: 'value' };

      act(() => {
        result.current.startPerformance(name, metadata);
      });

      expect(mockLoggingService.startPerformanceMeasurement).toHaveBeenCalledWith(name, metadata);
    });

    it('should end performance measurement and return duration', () => {
      const { result } = renderHook(() => useLogging());
      const name = 'test-measurement';
      const metadata = { key: 'value' };
      const expectedDuration = 100;

      mockLoggingService.endPerformanceMeasurement.mockReturnValue(expectedDuration);

      let duration: number | null = null;
      act(() => {
        duration = result.current.endPerformance(name, metadata);
      });

      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(name, metadata);
      expect(duration).toBe(expectedDuration);
    });

    it('should handle performance methods without metadata', () => {
      const { result } = renderHook(() => useLogging());
      const name = 'test-measurement';

      act(() => {
        result.current.startPerformance(name);
        result.current.endPerformance(name);
      });

      expect(mockLoggingService.startPerformanceMeasurement).toHaveBeenCalledWith(name, undefined);
      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(name, undefined);
    });
  });

  describe('API logging', () => {
    it('should log API request', () => {
      const { result } = renderHook(() => useLogging());
      const method = 'GET';
      const url = '/api/test';
      const data = { param: 'value' };

      act(() => {
        result.current.logApiRequest(method, url, data);
      });

      expect(mockLoggingService.logApiRequest).toHaveBeenCalledWith(method, url, data);
    });

    it('should log API response', () => {
      const { result } = renderHook(() => useLogging());
      const method = 'POST';
      const url = '/api/test';
      const status = 200;
      const duration = 150;
      const data = { result: 'success' };

      act(() => {
        result.current.logApiResponse(method, url, status, duration, data);
      });

      expect(mockLoggingService.logApiResponse).toHaveBeenCalledWith(method, url, status, duration, data);
    });

    it('should handle API logging without optional parameters', () => {
      const { result } = renderHook(() => useLogging());

      act(() => {
        result.current.logApiRequest('GET', '/api/test');
        result.current.logApiResponse('POST', '/api/test', 200);
      });

      expect(mockLoggingService.logApiRequest).toHaveBeenCalledWith('GET', '/api/test', undefined);
      expect(mockLoggingService.logApiResponse).toHaveBeenCalledWith('POST', '/api/test', 200, undefined, undefined);
    });
  });

  describe('component lifecycle logging', () => {
    it('should log component mount', () => {
      const { result } = renderHook(() => useLogging());
      const componentName = 'TestComponent';
      const props = { prop1: 'value1' };

      act(() => {
        result.current.logComponentMount(componentName, props);
      });

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'COMPONENT',
        `Component mounted: ${componentName}`,
        props
      );
    });

    it('should log component unmount', () => {
      const { result } = renderHook(() => useLogging());
      const componentName = 'TestComponent';
      const duration = 5000;

      act(() => {
        result.current.logComponentUnmount(componentName, duration);
      });

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'COMPONENT',
        `Component unmounted: ${componentName}`,
        { duration }
      );
    });

    it('should log component error', () => {
      const { result } = renderHook(() => useLogging());
      const componentName = 'TestComponent';
      const error = new Error('Component error');
      const errorInfo = { componentStack: 'stack trace' };

      act(() => {
        result.current.logComponentError(componentName, error, errorInfo);
      });

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'COMPONENT',
        `Component error: ${componentName}`,
        error,
        errorInfo
      );
    });

    it('should handle component lifecycle logging without optional parameters', () => {
      const { result } = renderHook(() => useLogging());

      act(() => {
        result.current.logComponentMount('TestComponent');
        result.current.logComponentUnmount('TestComponent');
        result.current.logComponentError('TestComponent', new Error('Test error'));
      });

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'COMPONENT',
        'Component mounted: TestComponent',
        undefined
      );
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'COMPONENT',
        'Component unmounted: TestComponent',
        { duration: undefined }
      );
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'COMPONENT',
        'Component error: TestComponent',
        expect.any(Error),
        undefined
      );
    });
  });

  describe('user interaction logging', () => {
    it('should log user action', () => {
      const { result } = renderHook(() => useLogging());
      const action = 'button_click';
      const data = { buttonId: 'submit', page: 'login' };

      act(() => {
        result.current.logUserAction(action, data);
      });

      expect(mockLoggingService.info).toHaveBeenCalledWith('USER_ACTION', action, data);
    });

    it('should handle user action logging without data', () => {
      const { result } = renderHook(() => useLogging());
      const action = 'page_view';

      act(() => {
        result.current.logUserAction(action);
      });

      expect(mockLoggingService.info).toHaveBeenCalledWith('USER_ACTION', action, undefined);
    });
  });

  describe('utility methods', () => {
    it('should set correlation ID', () => {
      const { result } = renderHook(() => useLogging());
      const correlationId = 'new-correlation-id';

      act(() => {
        result.current.setCorrelationId(correlationId);
      });

      expect(mockLoggingService.setCorrelationId).toHaveBeenCalledWith(correlationId);
    });

    it('should clear correlation ID', () => {
      const { result } = renderHook(() => useLogging());

      act(() => {
        result.current.clearCorrelationId();
      });

      expect(mockLoggingService.clearCorrelationId).toHaveBeenCalled();
    });

    it('should export logs', () => {
      const { result } = renderHook(() => useLogging());
      const options = { includeData: true };
      const expectedLogs = 'exported logs data';

      mockLoggingService.exportLogs.mockReturnValue(expectedLogs);

      let exportedLogs: string = '';
      act(() => {
        exportedLogs = result.current.exportLogs(options);
      });

      expect(mockLoggingService.exportLogs).toHaveBeenCalledWith(options);
      expect(exportedLogs).toBe(expectedLogs);
    });

    it('should handle export logs without options', () => {
      const { result } = renderHook(() => useLogging());
      const expectedLogs = 'exported logs data';

      mockLoggingService.exportLogs.mockReturnValue(expectedLogs);

      act(() => {
        result.current.exportLogs();
      });

      expect(mockLoggingService.exportLogs).toHaveBeenCalledWith(undefined);
    });
  });

  describe('callback stability', () => {
    it('should maintain stable callback references', () => {
      const { result, rerender } = renderHook(() => useLogging());

      const initialCallbacks = {
        debug: result.current.debug,
        info: result.current.info,
        warn: result.current.warn,
        error: result.current.error,
        startPerformance: result.current.startPerformance,
        endPerformance: result.current.endPerformance,
        logApiRequest: result.current.logApiRequest,
        logApiResponse: result.current.logApiResponse,
        logComponentMount: result.current.logComponentMount,
        logComponentUnmount: result.current.logComponentUnmount,
        logComponentError: result.current.logComponentError,
        logUserAction: result.current.logUserAction,
        setCorrelationId: result.current.setCorrelationId,
        clearCorrelationId: result.current.clearCorrelationId,
        exportLogs: result.current.exportLogs,
      };

      rerender();

      expect(result.current.debug).toBe(initialCallbacks.debug);
      expect(result.current.info).toBe(initialCallbacks.info);
      expect(result.current.warn).toBe(initialCallbacks.warn);
      expect(result.current.error).toBe(initialCallbacks.error);
      expect(result.current.startPerformance).toBe(initialCallbacks.startPerformance);
      expect(result.current.endPerformance).toBe(initialCallbacks.endPerformance);
      expect(result.current.logApiRequest).toBe(initialCallbacks.logApiRequest);
      expect(result.current.logApiResponse).toBe(initialCallbacks.logApiResponse);
      expect(result.current.logComponentMount).toBe(initialCallbacks.logComponentMount);
      expect(result.current.logComponentUnmount).toBe(initialCallbacks.logComponentUnmount);
      expect(result.current.logComponentError).toBe(initialCallbacks.logComponentError);
      expect(result.current.logUserAction).toBe(initialCallbacks.logUserAction);
      expect(result.current.setCorrelationId).toBe(initialCallbacks.setCorrelationId);
      expect(result.current.clearCorrelationId).toBe(initialCallbacks.clearCorrelationId);
      expect(result.current.exportLogs).toBe(initialCallbacks.exportLogs);
    });
  });
});

describe('usePerformanceLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without measurement name', () => {
      const { result } = renderHook(() => usePerformanceLogging());

      expect(result.current).toHaveProperty('start');
      expect(result.current).toHaveProperty('end');
    });

    it('should initialize with measurement name', () => {
      const measurementName = 'test-measurement';
      const { result } = renderHook(() => usePerformanceLogging(measurementName));

      expect(result.current).toHaveProperty('start');
      expect(result.current).toHaveProperty('end');
    });
  });

  describe('performance measurement', () => {
    it('should start measurement with provided name', () => {
      const { result } = renderHook(() => usePerformanceLogging());
      const name = 'custom-measurement';
      const metadata = { key: 'value' };

      act(() => {
        result.current.start(name, metadata);
      });

      expect(mockLoggingService.startPerformanceMeasurement).toHaveBeenCalledWith(name, metadata);
    });

    it('should start measurement with default name', () => {
      const measurementName = 'default-measurement';
      const { result } = renderHook(() => usePerformanceLogging(measurementName));
      const metadata = { key: 'value' };

      act(() => {
        result.current.start(undefined, metadata);
      });

      expect(mockLoggingService.startPerformanceMeasurement).toHaveBeenCalledWith(measurementName, metadata);
    });

    it('should end measurement with provided name', () => {
      const { result } = renderHook(() => usePerformanceLogging());
      const name = 'custom-measurement';
      const metadata = { key: 'value' };
      const expectedDuration = 200;

      mockLoggingService.endPerformanceMeasurement.mockReturnValue(expectedDuration);

      let duration: number | null = null;
      act(() => {
        duration = result.current.end(name, metadata);
      });

      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(name, metadata);
      expect(duration).toBe(expectedDuration);
    });

    it('should end measurement with default name', () => {
      const measurementName = 'default-measurement';
      const { result } = renderHook(() => usePerformanceLogging(measurementName));
      const metadata = { key: 'value' };
      const expectedDuration = 150;

      mockLoggingService.endPerformanceMeasurement.mockReturnValue(expectedDuration);

      let duration: number | null = null;
      act(() => {
        duration = result.current.end(undefined, metadata);
      });

      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(measurementName, metadata);
      expect(duration).toBe(expectedDuration);
    });

    it('should return null when no measurement name is provided', () => {
      const { result } = renderHook(() => usePerformanceLogging());

      let startResult: void;
      let endResult: number | null = null;

      act(() => {
        startResult = result.current.start();
        endResult = result.current.end();
      });

      expect(startResult).toBeUndefined();
      expect(endResult).toBeNull();
      expect(mockLoggingService.startPerformanceMeasurement).not.toHaveBeenCalled();
      expect(mockLoggingService.endPerformanceMeasurement).not.toHaveBeenCalled();
    });

    it('should handle measurements without metadata', () => {
      const measurementName = 'test-measurement';
      const { result } = renderHook(() => usePerformanceLogging(measurementName));

      act(() => {
        result.current.start();
        result.current.end();
      });

      expect(mockLoggingService.startPerformanceMeasurement).toHaveBeenCalledWith(measurementName, undefined);
      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(measurementName, undefined);
    });
  });

  describe('cleanup on unmount', () => {
    it('should end active measurements on unmount', () => {
      const measurementName = 'test-measurement';
      const { result, unmount } = renderHook(() => usePerformanceLogging(measurementName));

      // Start a measurement
      act(() => {
        result.current.start();
      });

      // Unmount the hook
      unmount();

      // Should call endPerformanceMeasurement with cleanup metadata
      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(
        measurementName,
        { cleanupOnUnmount: true }
      );
    });

    it('should end multiple active measurements on unmount', () => {
      const { result, unmount } = renderHook(() => usePerformanceLogging());

      // Start multiple measurements
      act(() => {
        result.current.start('measurement-1');
        result.current.start('measurement-2');
        result.current.start('measurement-3');
      });

      // Unmount the hook
      unmount();

      // Should call endPerformanceMeasurement for each active measurement
      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(
        'measurement-1',
        { cleanupOnUnmount: true }
      );
      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(
        'measurement-2',
        { cleanupOnUnmount: true }
      );
      expect(mockLoggingService.endPerformanceMeasurement).toHaveBeenCalledWith(
        'measurement-3',
        { cleanupOnUnmount: true }
      );
    });

    it('should not call cleanup for measurements that were already ended', () => {
      const measurementName = 'test-measurement';
      const { result, unmount } = renderHook(() => usePerformanceLogging(measurementName));

      // Start and end a measurement
      act(() => {
        result.current.start();
        result.current.end();
      });

      // Clear previous calls
      mockLoggingService.endPerformanceMeasurement.mockClear();

      // Unmount the hook
      unmount();

      // Should not call endPerformanceMeasurement again
      expect(mockLoggingService.endPerformanceMeasurement).not.toHaveBeenCalled();
    });
  });

  describe('callback behavior', () => {
    it('should create new callbacks when measurementName changes', () => {
      let measurementName = 'test-measurement-1';
      const { result, rerender } = renderHook(() => usePerformanceLogging(measurementName));

      const initialCallbacks = {
        start: result.current.start,
        end: result.current.end,
      };

      // Change the measurement name
      measurementName = 'test-measurement-2';
      rerender();

      // Callbacks should be different due to dependency change
      expect(result.current.start).not.toBe(initialCallbacks.start);
      expect(result.current.end).not.toBe(initialCallbacks.end);
    });
  });
});