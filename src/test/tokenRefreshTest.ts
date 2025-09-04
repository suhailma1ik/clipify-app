/**
 * Token Refresh Test
 * Simple test to verify token refresh functionality
 */

import { getTokenRefreshService } from '../services/tokenRefreshService';
import { getSecureTokenStorage } from '../services/secureTokenStorage';
import { rephraseService } from '../services/rephraseService';

export async function testTokenRefresh(): Promise<void> {
  console.log('=== Token Refresh Test ===');
  
  try {
    const tokenStorage = getSecureTokenStorage();
    const tokenRefreshService = getTokenRefreshService();
    
    // Check if we have tokens
    const hasAccessToken = await tokenStorage.hasValidAccessToken();
    const hasRefreshToken = await tokenStorage.hasRefreshToken();
    
    console.log('Token status:', {
      hasAccessToken,
      hasRefreshToken
    });
    
    if (!hasRefreshToken) {
      console.log('❌ No refresh token available - cannot test token refresh');
      return;
    }
    
    // Try to refresh the token
    console.log('🔄 Attempting token refresh...');
    const refreshResult = await tokenRefreshService.refreshToken();
    
    if (refreshResult) {
      console.log('✅ Token refresh successful!');
      
      // Get the new token
      const newToken = await tokenRefreshService.getCurrentAccessToken();
      console.log('New token available:', !!newToken);
      
      // Test with a simple rephrase request
      console.log('🧪 Testing rephrase with refreshed token...');
      try {
        const result = await rephraseService.rephrase(
          'This is a test message.',
          'casual',
          'Testing',
          'Developers',
          false
        );
        console.log('✅ Rephrase test successful:', result.rephrased_text);
      } catch (rephraseError) {
        console.log('❌ Rephrase test failed:', rephraseError);
      }
      
    } else {
      console.log('❌ Token refresh failed');
    }
    
  } catch (error) {
    console.error('❌ Token refresh test error:', error);
  }
}

// Function is already exported above