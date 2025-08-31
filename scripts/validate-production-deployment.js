#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * 
 * This script validates that the OAuth deep link fix implementation
 * is ready for production deployment by running comprehensive checks.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Validate that required files exist
 */
function validateRequiredFiles() {
  logHeader('Validating Required Files');
  
  const requiredFiles = [
    'src/services/serviceIntegrationManager.ts',
    'src/services/oauthFlowManager.ts',
    'src/services/deepLinkService.ts',
    'src/services/environmentService.ts',
    'src/services/tokenExchangeService.ts',
    'src/services/productionReadinessValidator.ts',
    'src/contexts/AuthContext.tsx',
    'src/components/auth/AuthWrapper.tsx',
    'src/utils/errorHandler.ts'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(path.dirname(__dirname), file);
    if (fs.existsSync(filePath)) {
      logSuccess(`${file} exists`);
    } else {
      logError(`${file} is missing`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

/**
 * Validate Tauri configuration files
 */
function validateTauriConfiguration() {
  logHeader('Validating Tauri Configuration');
  
  const tauriConfigs = [
    'src-tauri/tauri.conf.json',
    'src-tauri/tauri.prod.conf.json',
    'src-tauri/Cargo.toml'
  ];

  let allConfigsValid = true;

  for (const configFile of tauriConfigs) {
    const configPath = path.join(path.dirname(__dirname), configFile);
    
    if (fs.existsSync(configPath)) {
      logSuccess(`${configFile} exists`);
      
      if (configFile.endsWith('.json')) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          
          // Validate deep link configuration
          if (config.plugins && config.plugins['deep-link']) {
            logSuccess(`Deep link plugin configured in ${configFile}`);
          } else {
            logWarning(`Deep link plugin not found in ${configFile}`);
          }
          
          // Validate custom protocol schemes
          if (config.tauri && config.tauri.bundle && config.tauri.bundle.identifier) {
            logSuccess(`Bundle identifier configured in ${configFile}`);
          } else {
            logWarning(`Bundle identifier not configured in ${configFile}`);
          }
          
        } catch (error) {
          logError(`Invalid JSON in ${configFile}: ${error.message}`);
          allConfigsValid = false;
        }
      }
    } else {
      logError(`${configFile} is missing`);
      allConfigsValid = false;
    }
  }

  return allConfigsValid;
}

/**
 * Validate environment configuration
 */
function validateEnvironmentConfiguration() {
  logHeader('Validating Environment Configuration');
  
  const envFiles = ['.env', '.env.production', '.env.development'];
  let hasValidEnv = false;

  for (const envFile of envFiles) {
    const envPath = path.join(path.dirname(__dirname), envFile);
    
    if (fs.existsSync(envPath)) {
      logSuccess(`${envFile} exists`);
      hasValidEnv = true;
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check for required environment variables
      const requiredVars = [
        'VITE_PROD_API_BASE_URL',
        'VITE_PROD_OAUTH_BASE_URL',
        'VITE_DEV_API_BASE_URL',
        'VITE_DEV_OAUTH_BASE_URL'
      ];

      for (const varName of requiredVars) {
        if (envContent.includes(varName)) {
          logSuccess(`${varName} configured in ${envFile}`);
        } else {
          logWarning(`${varName} not found in ${envFile}`);
        }
      }
    }
  }

  if (!hasValidEnv) {
    logError('No environment configuration files found');
    return false;
  }

  return true;
}

/**
 * Validate package.json dependencies
 */
function validateDependencies() {
  logHeader('Validating Dependencies');
  
  const packageJsonPath = path.join(path.dirname(__dirname), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDependencies = [
      '@tauri-apps/api',
      '@tauri-apps/plugin-shell',
      '@tauri-apps/plugin-deep-link',
      '@tauri-apps/plugin-clipboard-manager',
      'react',
      'react-dom'
    ];

    const requiredDevDependencies = [
      '@tauri-apps/cli',
      'vite',
      'typescript',
      'vitest'
    ];

    let allDepsValid = true;

    // Check runtime dependencies
    for (const dep of requiredDependencies) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`${dep} dependency found`);
      } else {
        logError(`${dep} dependency missing`);
        allDepsValid = false;
      }
    }

    // Check dev dependencies
    for (const dep of requiredDevDependencies) {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        logSuccess(`${dep} dev dependency found`);
      } else {
        logWarning(`${dep} dev dependency missing`);
      }
    }

    return allDepsValid;
    
  } catch (error) {
    logError(`Error reading package.json: ${error.message}`);
    return false;
  }
}

/**
 * Validate TypeScript configuration
 */
function validateTypeScriptConfiguration() {
  logHeader('Validating TypeScript Configuration');
  
  const tsConfigPath = path.join(path.dirname(__dirname), 'tsconfig.json');
  
  if (!fs.existsSync(tsConfigPath)) {
    logError('tsconfig.json not found');
    return false;
  }

  try {
    const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8');
    // Remove comments from JSON (simple approach)
    const cleanedContent = tsConfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const tsConfig = JSON.parse(cleanedContent);
    
    // Check for required compiler options
    if (tsConfig.compilerOptions) {
      const requiredOptions = ['target', 'module', 'moduleResolution', 'strict'];
      
      for (const option of requiredOptions) {
        if (tsConfig.compilerOptions[option] !== undefined) {
          logSuccess(`TypeScript ${option} configured`);
        } else {
          logWarning(`TypeScript ${option} not configured`);
        }
      }
    }

    return true;
    
  } catch (error) {
    logError(`Error reading tsconfig.json: ${error.message}`);
    return false;
  }
}

/**
 * Validate build configuration
 */
function validateBuildConfiguration() {
  logHeader('Validating Build Configuration');
  
  const viteConfigPath = path.join(path.dirname(__dirname), 'vite.config.ts');
  
  if (fs.existsSync(viteConfigPath)) {
    logSuccess('vite.config.ts exists');
    
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Check for Tauri plugin
    if (viteConfig.includes('@tauri-apps/vite-plugin')) {
      logSuccess('Tauri Vite plugin configured');
    } else {
      logWarning('Tauri Vite plugin not found in vite.config.ts');
    }
    
    return true;
  } else {
    logError('vite.config.ts not found');
    return false;
  }
}

/**
 * Run production deployment validation
 */
async function runProductionValidation() {
  logHeader('Production Deployment Validation');
  logInfo('Validating OAuth Deep Link Fix implementation for production deployment...\n');

  const validationResults = {
    requiredFiles: validateRequiredFiles(),
    tauriConfiguration: validateTauriConfiguration(),
    environmentConfiguration: validateEnvironmentConfiguration(),
    dependencies: validateDependencies(),
    typeScriptConfiguration: validateTypeScriptConfiguration(),
    buildConfiguration: validateBuildConfiguration()
  };

  // Summary
  logHeader('Validation Summary');
  
  const passedChecks = Object.values(validationResults).filter(Boolean).length;
  const totalChecks = Object.keys(validationResults).length;
  
  log(`\nValidation Results: ${passedChecks}/${totalChecks} checks passed\n`);

  for (const [check, passed] of Object.entries(validationResults)) {
    if (passed) {
      logSuccess(`${check}: PASSED`);
    } else {
      logError(`${check}: FAILED`);
    }
  }

  // Overall result
  const allChecksPassed = passedChecks === totalChecks;
  
  if (allChecksPassed) {
    logSuccess('\n🎉 All validation checks passed! Ready for production deployment.');
    return 0;
  } else {
    logError(`\n💥 ${totalChecks - passedChecks} validation check(s) failed. Please fix the issues before deploying to production.`);
    return 1;
  }
}

/**
 * Display usage information
 */
function displayUsage() {
  log('\nUsage: node scripts/validate-production-deployment.js\n');
  log('This script validates the OAuth deep link fix implementation for production deployment.\n');
  log('Options:');
  log('  --help    Show this help message');
  log('  --verbose Enable verbose output\n');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    displayUsage();
    return 0;
  }

  try {
    const exitCode = await runProductionValidation();
    process.exit(exitCode);
  } catch (error) {
    logError(`Validation failed with error: ${error.message}`);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  runProductionValidation,
  validateRequiredFiles,
  validateTauriConfiguration,
  validateEnvironmentConfiguration,
  validateDependencies,
  validateTypeScriptConfiguration,
  validateBuildConfiguration
};