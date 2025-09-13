# Windows DeepLink Testing Script for Clipify
# Run this PowerShell script on Windows to test deeplink functionality

Write-Host "🪟 Clipify Windows DeepLink Testing Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check protocol registration
function Test-ProtocolRegistration {
    param([string]$Protocol)
    
    Write-Host "Checking registration for $Protocol://" -ForegroundColor Yellow
    
    try {
        # Check if protocol key exists
        $protocolKey = Get-ItemProperty -Path "HKCR:\$Protocol" -ErrorAction SilentlyContinue
        if (-not $protocolKey) {
            Write-Host "  ❌ Protocol key not found" -ForegroundColor Red
            return $false
        }
        
        # Check URL Protocol value
        $urlProtocol = Get-ItemProperty -Path "HKCR:\$Protocol" -Name "URL Protocol" -ErrorAction SilentlyContinue
        if (-not $urlProtocol) {
            Write-Host "  ⚠️  Protocol key exists but missing 'URL Protocol' value" -ForegroundColor Orange
            return $false
        }
        
        # Check command handler
        $commandKey = Get-ItemProperty -Path "HKCR:\$Protocol\shell\open\command" -ErrorAction SilentlyContinue
        if (-not $commandKey) {
            Write-Host "  ⚠️  Missing command handler" -ForegroundColor Orange
            return $false
        }
        
        $commandValue = $commandKey.'(default)'
        Write-Host "  ✅ Fully registered" -ForegroundColor Green
        Write-Host "     Command: $commandValue" -ForegroundColor Gray
        return $true
        
    } catch {
        Write-Host "  ❌ Error checking registration: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to register a protocol
function Register-Protocol {
    param(
        [string]$Protocol,
        [string]$AppPath
    )
    
    Write-Host "Registering $Protocol:// protocol..." -ForegroundColor Yellow
    
    try {
        # Create main protocol key
        New-Item -Path "HKCR:\$Protocol" -Force | Out-Null
        Set-ItemProperty -Path "HKCR:\$Protocol" -Name "(Default)" -Value "URL:$Protocol Protocol"
        Set-ItemProperty -Path "HKCR:\$Protocol" -Name "URL Protocol" -Value ""
        
        # Create DefaultIcon key
        New-Item -Path "HKCR:\$Protocol\DefaultIcon" -Force | Out-Null
        Set-ItemProperty -Path "HKCR:\$Protocol\DefaultIcon" -Name "(Default)" -Value "$AppPath,0"
        
        # Create command handler
        New-Item -Path "HKCR:\$Protocol\shell\open\command" -Force | Out-Null
        Set-ItemProperty -Path "HKCR:\$Protocol\shell\open\command" -Name "(Default)" -Value "`"$AppPath`" `"%1`""
        
        Write-Host "  ✅ Successfully registered $Protocol://" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "  ❌ Failed to register $Protocol://: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test deeplink
function Test-DeepLink {
    param([string]$Url)
    
    Write-Host "Testing deeplink: $Url" -ForegroundColor Yellow
    
    try {
        Start-Process $Url
        Write-Host "  ✅ Deeplink opened successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ❌ Failed to open deeplink: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "\n1. Checking Administrator Privileges" -ForegroundColor Cyan
if (Test-Administrator) {
    Write-Host "  ✅ Running as Administrator" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Not running as Administrator - protocol registration may fail" -ForegroundColor Orange
    Write-Host "     Consider running PowerShell as Administrator for full functionality" -ForegroundColor Gray
}

Write-Host "\n2. Checking Current Protocol Registration" -ForegroundColor Cyan
$protocols = @("clipify", "appclipify", "clipify-dev")
$registrationStatus = @{}

foreach ($protocol in $protocols) {
    $registrationStatus[$protocol] = Test-ProtocolRegistration $protocol
}

# Find Clipify executable
Write-Host "\n3. Locating Clipify Executable" -ForegroundColor Cyan
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Clipify\Clipify.exe",
    "$env:PROGRAMFILES\Clipify\Clipify.exe",
    "$env:PROGRAMFILES(X86)\Clipify\Clipify.exe",
    ".\src-tauri\target\release\refine.exe",
    ".\target\release\refine.exe"
)

$clipifyPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $clipifyPath = $path
        Write-Host "  ✅ Found Clipify at: $clipifyPath" -ForegroundColor Green
        break
    }
}

if (-not $clipifyPath) {
    Write-Host "  ❌ Clipify executable not found" -ForegroundColor Red
    Write-Host "     Please ensure Clipify is installed or built" -ForegroundColor Gray
    $clipifyPath = Read-Host "Enter path to Clipify.exe (or press Enter to skip registration)"
}

# Register protocols if needed and administrator
if ($clipifyPath -and (Test-Administrator)) {
    Write-Host "\n4. Registering Missing Protocols" -ForegroundColor Cyan
    
    foreach ($protocol in $protocols) {
        if (-not $registrationStatus[$protocol]) {
            Register-Protocol $protocol $clipifyPath
        } else {
            Write-Host "  ✅ $protocol:// already registered" -ForegroundColor Green
        }
    }
} elseif ($clipifyPath) {
    Write-Host "\n4. Protocol Registration Skipped" -ForegroundColor Cyan
    Write-Host "  ⚠️  Administrator privileges required for registration" -ForegroundColor Orange
} else {
    Write-Host "\n4. Protocol Registration Skipped" -ForegroundColor Cyan
    Write-Host "  ⚠️  Clipify executable not found" -ForegroundColor Orange
}

# Test deeplinks
Write-Host "\n5. Testing DeepLinks" -ForegroundColor Cyan
$testUrls = @(
    "clipify://test-auth-callback?code=test123&state=test456",
    "appclipify://auth-success?token=sample_token",
    "clipify-dev://debug-test?param=value"
)

foreach ($url in $testUrls) {
    Test-DeepLink $url
    Start-Sleep -Seconds 1
}

# Summary
Write-Host "\n📋 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

Write-Host "Protocol Registration Status:" -ForegroundColor White
foreach ($protocol in $protocols) {
    $status = if ($registrationStatus[$protocol]) { "✅ Registered" } else { "❌ Not Registered" }
    Write-Host "  $protocol:// - $status"
}

Write-Host "\nClipify Executable: $(if ($clipifyPath) { "✅ Found at $clipifyPath" } else { "❌ Not Found" })" -ForegroundColor White
Write-Host "Administrator Mode: $(if (Test-Administrator) { "✅ Yes" } else { "❌ No" })" -ForegroundColor White

Write-Host "\n🔧 Troubleshooting Tips:" -ForegroundColor Cyan
Write-Host "- If protocols are not registered, run this script as Administrator"
Write-Host "- Check Windows Event Viewer for application errors"
Write-Host "- Verify Clipify.exe exists and is not blocked by antivirus"
Write-Host "- Test deeplinks from browser address bar or Run dialog (Win+R)"
Write-Host "- Use Registry Editor (regedit) to manually inspect HKEY_CLASSES_ROOT"

Write-Host "\n✅ Windows DeepLink Testing Complete!" -ForegroundColor Green
Write-Host "\nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")