# Windows MSI Build Guide

This guide explains how to build Windows MSI installers for Clipify using GitHub Actions.

## 🚀 Quick Start

### Option 1: Manual Workflow Trigger
1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select "Build Windows MSI" workflow
4. Click **Run workflow**
5. Optionally specify a version tag (e.g., `v1.0.0`)
6. Choose whether to create a release
7. Click **Run workflow**

### Option 2: Automatic on Tag Push
```bash
git tag v1.0.0
git push origin v1.0.0
```

## 📁 Available Workflows

### 1. `build-windows.yml` - Standard MSI Build
- **Purpose**: Creates unsigned MSI installers
- **Triggers**: 
  - Manual workflow dispatch
  - Git tag pushes (`v*`)
  - Pull requests to main/master
- **Output**: Unsigned `.msi` file
- **Use case**: Development, testing, internal distribution

### 2. `build-windows-signed.yml` - Signed MSI Build
- **Purpose**: Creates code-signed MSI installers for production
- **Triggers**: Manual workflow dispatch only
- **Output**: Digitally signed `.msi` file
- **Use case**: Production releases, public distribution

## 🔧 Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)
The configuration has been updated with:
- Windows-specific WiX settings for MSI generation
- Product metadata (name, description, copyright)
- Bundle targets set to "all" for cross-platform builds

### Required Secrets (for signed builds)
Add these to your GitHub repository secrets:

```
WINDOWS_CERTIFICATE          # Base64-encoded .p12/.pfx certificate file
WINDOWS_CERTIFICATE_PASSWORD # Password for the certificate
```

## 📦 Build Outputs

### Artifacts
- **MSI files**: Located in `src-tauri/target/release/bundle/msi/`
- **GitHub Artifacts**: Automatically uploaded with 30-90 day retention
- **GitHub Releases**: Created automatically (optional)

### File Naming
- Standard: `clipify_0.1.0_x64_en-US.msi`
- Signed: `clipify_0.1.0_x64_en-US.msi` (with digital signature)

## 🔐 Code Signing Setup

### 1. Obtain a Code Signing Certificate
- Purchase from a trusted CA (DigiCert, Sectigo, etc.)
- Or use a self-signed certificate for testing

### 2. Convert Certificate to Base64
```bash
# Convert .p12/.pfx to base64
base64 -i your-certificate.p12 -o certificate-base64.txt
```

### 3. Add GitHub Secrets
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add `WINDOWS_CERTIFICATE` with the base64 content
3. Add `WINDOWS_CERTIFICATE_PASSWORD` with the certificate password

## 🛠️ Local Development

### Prerequisites
- Windows 10/11
- Node.js 18+
- Rust toolchain
- WiX Toolset v3.11

### Build Locally
```bash
# Install dependencies
npm ci

# Build frontend
npm run build:prod

# Build MSI (from src-tauri directory)
cd src-tauri
cargo tauri build --bundles msi
```

## 📋 Workflow Features

### Standard Build (`build-windows.yml`)
- ✅ Automatic version detection from tags/inputs
- ✅ WiX Toolset installation
- ✅ Rust caching for faster builds
- ✅ Artifact upload with retention
- ✅ Detailed release notes
- ✅ Build summary with file sizes

### Signed Build (`build-windows-signed.yml`)
- ✅ All standard build features
- ✅ Code signing with certificates
- ✅ Signature verification
- ✅ Enhanced security metadata
- ✅ Production-ready releases

## 🔍 Troubleshooting

### Common Issues

#### 1. WiX Toolset Not Found
```
Error: WiX Toolset not found
```
**Solution**: The workflow automatically installs WiX. If issues persist, check the WiX installation step logs.

#### 2. Certificate Issues
```
Error: Failed to sign the MSI
```
**Solution**: 
- Verify certificate is valid and not expired
- Check certificate password in secrets
- Ensure certificate is in .p12/.pfx format

#### 3. Build Failures
```
Error: Failed to build frontend
```
**Solution**:
- Check Node.js version compatibility
- Verify all dependencies are properly listed in package.json
- Review build logs for specific error messages

### Debug Steps
1. Check workflow logs in GitHub Actions
2. Verify all secrets are properly set
3. Test build locally first
4. Check Tauri configuration syntax

## 📈 Best Practices

### Version Management
- Use semantic versioning (e.g., `v1.0.0`, `v1.0.1`)
- Create tags for releases: `git tag v1.0.0 && git push origin v1.0.0`
- Use pre-release tags for testing: `v1.0.0-beta.1`

### Release Strategy
1. **Development**: Use standard unsigned builds
2. **Testing**: Use signed builds with pre-release flag
3. **Production**: Use signed builds with full releases

### Security
- Keep certificates secure and rotate regularly
- Use different certificates for development vs production
- Monitor certificate expiration dates
- Review code signing best practices

## 🎯 Next Steps

1. **Test the workflow**: Run a manual build to verify everything works
2. **Set up signing**: Add certificates for production builds
3. **Automate releases**: Configure automatic releases on tag pushes
4. **Monitor builds**: Set up notifications for build failures

## 📞 Support

If you encounter issues:
1. Check the workflow logs in GitHub Actions
2. Review this documentation
3. Test builds locally to isolate issues
4. Check Tauri documentation for MSI-specific problems
