import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '../utils';

type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'requesting';

interface HotkeyPermissionState {
  status: PermissionStatus;
  showPermissionRequest: boolean;
  error: string | null;
}

export const useHotkeyPermission = () => {
  const [state, setState] = useState<HotkeyPermissionState>({
    status: 'unknown',
    showPermissionRequest: false,
    error: null
  });

  // Check if permission was previously granted (stored in localStorage)
  useEffect(() => {
    const savedPermission = localStorage.getItem('hotkey-permission');
    if (savedPermission === 'granted') {
      setState(prev => ({ ...prev, status: 'granted' }));
    } else if (savedPermission === 'denied') {
      setState(prev => ({ ...prev, status: 'denied' }));
    }
  }, []);

  const requestPermission = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showPermissionRequest: true, 
      error: null 
    }));
  }, []);

  const grantPermission = useCallback(async () => {
    console.log('🔐 Starting permission grant process...');
    setState(prev => ({ ...prev, status: 'requesting' }));
    
    if (!isTauriEnvironment()) {
      // In browser environment, we can't register global shortcuts
      // but we can still grant "permission" for UI consistency
      localStorage.setItem('hotkey-permission', 'denied');
      
      setState(prev => ({
        ...prev,
        status: 'denied',
        showPermissionRequest: false,
        error: 'Global shortcuts not available in browser environment'
      }));
      
      return false;
    }
    
    try {
      // Use the comprehensive status check first
      console.log('🔍 Checking comprehensive accessibility and shortcut status...');
      const statusResult = await invoke('check_accessibility_permissions_and_shortcut_status');
      console.log('📊 Status check result:', statusResult);
      
      if (typeof statusResult === 'object' && statusResult !== null) {
        const status = statusResult as {
          accessibility_granted: boolean;
          shortcut_registered: boolean;
          can_register_shortcut: boolean;
          error_message: string | null;
          needs_restart: boolean;
        };
        
        if (!status.accessibility_granted) {
          console.log('❌ Accessibility permissions not granted');
          
          // Show specific error message and open system preferences
          const errorMessage = status.error_message || 'Accessibility permissions required for global shortcuts';
          
          setState(prev => ({
            ...prev,
            status: 'denied',
            showPermissionRequest: false,
            error: errorMessage + (status.needs_restart ? ' You may need to restart the app after granting permissions.' : '')
          }));
          
          // Try to open System Preferences to the Accessibility section
          console.log('🔧 Opening System Preferences...');
          try {
            await invoke('open_accessibility_settings');
            console.log('✅ System Preferences opened successfully');
          } catch (shellError) {
            console.error('❌ Failed to open System Preferences:', shellError);
            // Show a more helpful error message to the user
            const detailedError = `${errorMessage}. Unable to automatically open System Settings. Please manually open System Settings > Privacy & Security > Accessibility and add Clipify.`;
            setState(prev => ({
              ...prev,
              error: detailedError + (status.needs_restart ? ' You may need to restart the app after granting permissions.' : '')
            }));
          }
          
          return false;
        }
        
        if (status.shortcut_registered) {
          console.log('ℹ️ Global shortcut is already registered');
          
          // Save permission to localStorage
          localStorage.setItem('hotkey-permission', 'granted');
          
          setState(prev => ({
            ...prev,
            status: 'granted',
            showPermissionRequest: false,
            error: null
          }));
          
          return true;
        }
        
        if (!status.can_register_shortcut) {
          console.log('❌ Cannot register shortcut');
          const errorMessage = status.error_message || 'Unable to register global shortcut';
          
          setState(prev => ({
            ...prev,
            status: 'denied',
            showPermissionRequest: false,
            error: errorMessage
          }));
          
          return false;
        }
      }
      
      // Accessibility permissions are granted, now register the global shortcut
      console.log('⌨️ Registering global shortcut...');
      await invoke('register_global_shortcut');
      console.log('✅ Global shortcut registered successfully');
      
      // Save permission to localStorage
      localStorage.setItem('hotkey-permission', 'granted');
      
      setState(prev => ({
        ...prev,
        status: 'granted',
        showPermissionRequest: false,
        error: null
      }));
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register hotkey';
      console.log('❌ Permission grant failed:', errorMessage);
      
      setState(prev => ({
        ...prev,
        status: 'denied',
        showPermissionRequest: false,
        error: errorMessage
      }));
      
      return false;
    }
  }, []);

  const denyPermission = useCallback(() => {
    // Save denial to localStorage
    localStorage.setItem('hotkey-permission', 'denied');
    
    setState(prev => ({
      ...prev,
      status: 'denied',
      showPermissionRequest: false,
      error: null
    }));
  }, []);

  const revokePermission = useCallback(async () => {
    if (!isTauriEnvironment()) {
      // In browser environment, just update local state
      localStorage.removeItem('hotkey-permission');
      
      setState(prev => ({
        ...prev,
        status: 'denied',
        showPermissionRequest: false,
        error: null
      }));
      
      return true;
    }
    
    try {
      // Call Tauri command to unregister the global shortcut
      await invoke('unregister_global_shortcut');
      
      // Remove permission from localStorage
      localStorage.removeItem('hotkey-permission');
      
      setState(prev => ({
        ...prev,
        status: 'denied',
        showPermissionRequest: false,
        error: null
      }));
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke hotkey';
      
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      return false;
    }
  }, []);

  const resetPermission = useCallback(() => {
    localStorage.removeItem('hotkey-permission');
    setState({
      status: 'unknown',
      showPermissionRequest: false,
      error: null
    });
  }, []);

  const dismissPermissionRequest = useCallback(() => {
    setState(prev => ({ ...prev, showPermissionRequest: false }));
  }, []);

  return {
    // State
    permissionStatus: state.status,
    showPermissionRequest: state.showPermissionRequest,
    error: state.error,
    isRequesting: state.status === 'requesting',
    hasPermission: state.status === 'granted',
    
    // Actions
    requestPermission,
    grantPermission,
    denyPermission,
    revokePermission,
    resetPermission,
    dismissPermissionRequest
  };
};