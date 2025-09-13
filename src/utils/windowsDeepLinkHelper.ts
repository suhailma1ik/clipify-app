import { invoke } from '@tauri-apps/api/core';
import * as path from '@tauri-apps/api/path';

export interface ProtocolRegistrationStatus {
  scheme: string;
  is_registered: boolean;
  error?: string;
}

export interface DeepLinkDiagnostics {
  protocols: ProtocolRegistrationStatus[];
  tauri_version: string;
  environment: string;
  last_error?: string;
  event_listener_active: boolean;
}

/**
 * Check if deeplink protocols are properly registered on Windows
 */
export async function checkWindowsDeepLinkRegistration(): Promise<DeepLinkDiagnostics> {
  try {
    return await invoke<DeepLinkDiagnostics>('verify_deep_link_protocols');
  } catch (error) {
    console.error('Failed to check deeplink registration:', error);
    throw error;
  }
}

/**
 * Check registration status for a specific protocol
 */
export async function checkProtocolRegistration(scheme: string): Promise<ProtocolRegistrationStatus> {
  try {
    return await invoke<ProtocolRegistrationStatus>('check_protocol_registration', { scheme });
  } catch (error) {
    console.error(`Failed to check protocol registration for ${scheme}:`, error);
    throw error;
  }
}

/**
 * Attempt to register deeplink protocols on Windows (requires admin privileges)
 */
export async function registerWindowsProtocols(): Promise<string[]> {
  const results: string[] = [];
  const protocols = ['clipify', 'appclipify', 'clipify-dev'];
  
  try {
    // Get the current executable path
    const appDir = await path.resolveResource('');
    const executablePath = await path.join(appDir, '../Clipify.exe');
    
    for (const protocol of protocols) {
      try {
        const result = await invoke<string>('register_protocol_windows', {
          scheme: protocol,
          appPath: executablePath
        });
        results.push(`${protocol}: ${result}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push(`${protocol}: Failed - ${errorMsg}`);
        console.error(`Failed to register ${protocol}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to get executable path:', error);
    throw new Error('Could not determine application path for protocol registration');
  }
  
  return results;
}

/**
 * Show Windows deeplink diagnostic information
 */
export async function showWindowsDeepLinkDiagnostics(): Promise<void> {
  try {
    const diagnostics = await checkWindowsDeepLinkRegistration();
    
    console.group('🔗 Windows DeepLink Diagnostics');
    console.log('Tauri Version:', diagnostics.tauri_version);
    console.log('Environment:', diagnostics.environment);
    console.log('Event Listener Active:', diagnostics.event_listener_active);
    
    if (diagnostics.last_error) {
      console.error('Last Error:', diagnostics.last_error);
    }
    
    console.group('Protocol Registration Status:');
    diagnostics.protocols.forEach(protocol => {
      const status = protocol.is_registered ? '✅ Registered' : '❌ Not Registered';
      console.log(`${protocol.scheme}://`, status);
      if (protocol.error) {
        console.warn(`  Error: ${protocol.error}`);
      }
    });
    console.groupEnd();
    
    // Check if any protocols are not registered
    const unregistered = diagnostics.protocols.filter(p => !p.is_registered);
    if (unregistered.length > 0) {
      console.warn('⚠️ Some protocols are not registered. Consider running as administrator and calling registerWindowsProtocols()');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Failed to show diagnostics:', error);
  }
}

/**
 * Test deeplink functionality by opening a test URL
 */
export async function testDeepLink(scheme: string = 'clipify', testData: string = 'test-auth-callback'): Promise<void> {
  const testUrl = `${scheme}://${testData}`;
  
  try {
    // On Windows, we can use the shell to open the URL
    await invoke('open_url', { url: testUrl });
    console.log(`🧪 Testing deeplink: ${testUrl}`);
  } catch (error) {
    console.error('Failed to test deeplink:', error);
    // Fallback: try to open with window.open (may not work for custom protocols)
    window.open(testUrl, '_self');
  }
}

/**
 * Initialize Windows deeplink diagnostics on app startup
 */
export async function initializeWindowsDeepLinkDiagnostics(): Promise<void> {
  // Only run diagnostics on Windows
  if (navigator.platform.toLowerCase().includes('win')) {
    console.log('🪟 Windows detected - Running deeplink diagnostics...');
    await showWindowsDeepLinkDiagnostics();
  }
}