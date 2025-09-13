import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  checkWindowsDeepLinkRegistration, 
  registerWindowsProtocols,
  testDeepLink,
  DeepLinkDiagnostics
} from '../utils/windowsDeepLinkHelper';

interface WindowsDeepLinkDiagnosticsProps {
  className?: string;
}

export const WindowsDeepLinkDiagnostics: React.FC<WindowsDeepLinkDiagnosticsProps> = ({ 
  className = '' 
}) => {
  const [diagnostics, setDiagnostics] = useState<DeepLinkDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationResults, setRegistrationResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWindows, setIsWindows] = useState(false);

  useEffect(() => {
    // Check if running on Windows
    const checkPlatform = async () => {
      try {
        const platform = await invoke<string>('get_platform');
        setIsWindows(platform.toLowerCase().includes('windows'));
      } catch {
        // Fallback to navigator check
        setIsWindows(navigator.platform.toLowerCase().includes('win'));
      }
    };
    
    checkPlatform();
    
    if (isWindows) {
      loadDiagnostics();
    }
  }, [isWindows]);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkWindowsDeepLinkRegistration();
      setDiagnostics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterProtocols = async () => {
    setLoading(true);
    setError(null);
    setRegistrationResults([]);
    
    try {
      const results = await registerWindowsProtocols();
      setRegistrationResults(results);
      
      // Reload diagnostics after registration attempt
      setTimeout(() => {
        loadDiagnostics();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register protocols');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDeepLink = async (scheme: string) => {
    try {
      await testDeepLink(scheme, 'test-windows-deeplink');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test deeplink');
    }
  };

  if (!isWindows) {
    return (
      <div className={`p-4 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-600">Windows DeepLink Diagnostics are only available on Windows.</p>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🪟 Windows DeepLink Diagnostics</h3>
        <button
          onClick={loadDiagnostics}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {diagnostics && (
        <div className="space-y-4">
          {/* System Information */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Tauri Version:</span>
              <span className="ml-2 text-gray-600">{diagnostics.tauri_version}</span>
            </div>
            <div>
              <span className="font-medium">Environment:</span>
              <span className="ml-2 text-gray-600">{diagnostics.environment}</span>
            </div>
            <div>
              <span className="font-medium">Event Listener:</span>
              <span className={`ml-2 ${diagnostics.event_listener_active ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics.event_listener_active ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            {diagnostics.last_error && (
              <div className="col-span-2">
                <span className="font-medium text-red-600">Last Error:</span>
                <span className="ml-2 text-red-500">{diagnostics.last_error}</span>
              </div>
            )}
          </div>

          {/* Protocol Registration Status */}
          <div>
            <h4 className="font-medium mb-2">Protocol Registration Status</h4>
            <div className="space-y-2">
              {diagnostics.protocols.map((protocol) => (
                <div key={protocol.scheme} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm">{protocol.scheme}://</span>
                    <span className={`text-sm ${protocol.is_registered ? 'text-green-600' : 'text-red-600'}`}>
                      {protocol.is_registered ? '✅ Registered' : '❌ Not Registered'}
                    </span>
                    {protocol.error && (
                      <span className="text-xs text-orange-600" title={protocol.error}>
                        ⚠️ {protocol.error.length > 50 ? protocol.error.substring(0, 50) + '...' : protocol.error}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleTestDeepLink(protocol.scheme)}
                    disabled={!protocol.is_registered}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    Test
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Registration Actions */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Protocol Registration</h4>
              <button
                onClick={handleRegisterProtocols}
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Protocols (Admin Required)'}
              </button>
            </div>
            
            {registrationResults.length > 0 && (
              <div className="p-3 bg-gray-50 rounded">
                <h5 className="font-medium mb-2">Registration Results:</h5>
                <ul className="space-y-1 text-sm">
                  {registrationResults.map((result, index) => (
                    <li key={index} className="font-mono text-xs">
                      {result}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Troubleshooting Tips */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Troubleshooting Tips</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• If protocols are not registered, try running the app as Administrator</li>
              <li>• Check Windows Registry at HKEY_CLASSES_ROOT for protocol entries</li>
              <li>• Ensure the MSI installer includes protocol registration</li>
              <li>• Test deeplinks from external applications (browser, command line)</li>
              <li>• Verify the app executable path in registry entries</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WindowsDeepLinkDiagnostics;