import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '../utils';

interface PermissionStatus {
  accessibility_granted: boolean;
  shortcut_registered: boolean;
  can_register_shortcut: boolean;
  error_message: string | null;
  needs_restart: boolean;
}

interface UseHotkeyPermissionReturn {
  permissionStatus: PermissionStatus | null;
  isLoading: boolean;
  error: string | null;
  checkPermissions: () => Promise<void>;
  requestPermissions: () => Promise<void>;
  registerShortcut: () => Promise<void>;
  openAccessibilitySettings: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useHotkeyPermission = (): UseHotkeyPermissionReturn => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermissions = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Permission checking not available in browser environment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Checking accessibility permissions and shortcut status...');
      
      // Check accessibility permissions using backend
      let accessibilityGranted = false;
      try {
        await invoke('check_accessibility_permissions');
        accessibilityGranted = true;
      } catch (err) {
        console.log('Accessibility permissions not granted:', err);
        accessibilityGranted = false;
      }

      // Check if shortcut is registered using Tauri v2 API
      let shortcutRegistered = false;
      try {
        const { isRegistered } = await import('@tauri-apps/plugin-global-shortcut');
        shortcutRegistered = await isRegistered('CommandOrControl+Shift+C');
      } catch (err) {
        console.log('Could not check shortcut registration:', err);
        shortcutRegistered = false;
      }

      const status: PermissionStatus = {
        accessibility_granted: accessibilityGranted,
        shortcut_registered: shortcutRegistered,
        can_register_shortcut: accessibilityGranted,
        error_message: null,
        needs_restart: false
      };

      console.log('✅ Permission status received:', status);
      setPermissionStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to check permissions:', errorMessage);
      setError(errorMessage);
      setPermissionStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Permission request not available in browser environment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Requesting input monitoring permission...');
      
      // First, try to trigger input monitoring permission prompt
      try {
        await invoke('request_input_monitoring_permission');
        console.log('✅ Input monitoring permission check completed');
      } catch (inputErr) {
        console.log('Input monitoring permission needed:', inputErr);
      }
      
      console.log('🔐 Opening accessibility settings...');
      await invoke('open_accessibility_settings');
      console.log('✅ Accessibility settings opened successfully');
      
      // Wait a moment then refresh status
      setTimeout(() => {
        checkPermissions();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to request permissions:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions]);

  const registerShortcut = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Shortcut registration not available in browser environment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('⌨️ Registering global shortcut using Tauri v2 API...');
      
      // Use Tauri v2 frontend API instead of backend commands
      const { register, isRegistered, unregister } = await import('@tauri-apps/plugin-global-shortcut');

      const shortcut = 'CommandOrControl+Shift+C';

      // If already registered (by us or another instance), try to unregister first
      try {
        const already = await isRegistered(shortcut);
        if (already) {
          console.log(`Shortcut ${shortcut} already registered. Attempting to unregister before re-registering...`);
          await unregister(shortcut);
        }
      } catch (preErr) {
        console.warn('Could not check/unregister existing shortcut before registering:', preErr);
      }

      const doRegister = async () => {
        await register(shortcut, (event) => {
          console.log('Global shortcut triggered:', event);
          if (event.state === 'Pressed') {
            // Trigger the clipboard copy and clean functionality
            // Use the proper command that handles the state internally
            invoke('trigger_clipboard_copy').catch(err => {
              console.error('Failed to copy selected text:', err);
            });
          }
        });
      };

      try {
        await doRegister();
      } catch (regErr) {
        const msg = regErr instanceof Error ? regErr.message : String(regErr);
        // If registration failed due to previous binding, force unregister and retry once
        if (msg.includes('RegisterEventHotKey failed')) {
          console.warn('RegisterEventHotKey failed. Attempting to unregister existing binding and retry once...');
          try {
            await unregister(shortcut);
          } catch (unregErr) {
            console.warn('Unregister on failure also failed (may not be previously registered by us):', unregErr);
          }
          await doRegister();
        } else {
          throw regErr;
        }
      }
      
      console.log('✅ Global shortcut registered successfully using Tauri v2 API');
      
      // Refresh status after registration
      await checkPermissions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to register global shortcut:', errorMessage);
      setError(errorMessage);
      
      // If it's a permission error, suggest opening settings
      if (errorMessage.includes('permission') || errorMessage.includes('accessibility')) {
        console.log('🔧 Permission error detected, user may need to grant accessibility permissions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions]);

  const openAccessibilitySettings = useCallback(async () => {
    if (!isTauriEnvironment()) {
      console.warn('Settings opening not available in browser environment');
      return;
    }

    try {
      console.log('🔧 Opening accessibility settings...');
      await invoke('open_accessibility_settings');
      console.log('✅ Accessibility settings opened');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to open accessibility settings:', errorMessage);
      setError(errorMessage);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    await checkPermissions();
  }, [checkPermissions]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissionStatus,
    isLoading,
    error,
    checkPermissions,
    requestPermissions,
    registerShortcut,
    openAccessibilitySettings,
    refreshStatus,
  };
};
