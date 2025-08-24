// Simple test script to verify logging is working
console.log('=== Authentication Flow Logging Test ===');

// Test environment detection
console.log('Testing environment detection...');

// Check for explicit environment variable
const envVar = process.env.VITE_ENVIRONMENT;
console.log('VITE_ENVIRONMENT:', envVar);

if (envVar === 'production') {
  console.log('Detected production environment from VITE_ENVIRONMENT');
  console.log('Environment: production');
} else if (envVar === 'development') {
  console.log('Detected development environment from VITE_ENVIRONMENT');
  console.log('Environment: development');
} else {
  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  console.log('NODE_ENV:', nodeEnv);
  
  if (nodeEnv === 'production') {
    console.log('Detected production environment from NODE_ENV');
    console.log('Environment: production');
  } else if (nodeEnv === 'development') {
    console.log('Detected development environment from NODE_ENV');
    console.log('Environment: development');
  } else {
    // Default to development
    console.log('Defaulting to development environment');
    console.log('Environment: development');
  }
}

console.log('=== Test Complete ===');