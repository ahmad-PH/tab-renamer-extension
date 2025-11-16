# Chrome Migration Guide for Selenium Tests

## Overview
This guide explains the changes made to migrate your Selenium tests from using ChromeDriver to using Chrome directly, in response to the deprecation of the `--load-extension` flag.

## Changes Made

### 1. Removed ChromeDriver Dependencies
- **File**: `tests/e2e/seleniumTests.test.js`
- **Removed**: `const chromedriver = require('chromedriver');`
- **Removed**: `let chromeService = new chrome.ServiceBuilder(chromedriver.path);`
- **Removed**: `.setChromeService(chromeService)` from the WebDriver builder

### 2. Updated Extension Loading
- **File**: `tests/e2e/seleniumTests.test.js`
- **Changed**: `.addArguments(\`--load-extension=${extensionPath}\`)` 
- **To**: `.addExtensions(extensionPath)`

### 3. Updated Package Dependencies
- **File**: `package.json`
- **Removed**: `"chromedriver": "^139.0.3"`

## What This Means

### Before (ChromeDriver)
- Tests used ChromeDriver binary to control Chrome
- Extension loaded via deprecated `--load-extension` flag
- Required `chromedriver` npm package

### After (Chrome)
- Tests use Chrome browser directly via Selenium WebDriver
- Extension loaded via modern `.addExtensions()` method
- No external ChromeDriver binary needed

## Benefits of This Migration

1. **Future-proof**: No more deprecated flag warnings
2. **Simpler setup**: No need to manage ChromeDriver versions
3. **Better compatibility**: Direct Chrome integration
4. **Cleaner code**: Removed unnecessary service layer

## Next Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Chrome Installation
Make sure you have Chrome browser installed on your system. The tests will now use your system's Chrome installation.

### 3. Test the Migration
Run your tests to ensure everything works:
```bash
npm test
```

### 4. Optional: Update CI/CD
If you're running these tests in CI/CD, you may need to:
- Remove ChromeDriver installation steps
- Ensure Chrome browser is available in your CI environment
- Update any Docker images to include Chrome instead of ChromeDriver

## Troubleshooting

### Common Issues

1. **Chrome not found**: Ensure Chrome is installed and accessible in your PATH
2. **Extension loading fails**: Verify the extension path is correct and contains a valid `manifest.json`
3. **Permission issues**: Chrome may need appropriate permissions to load extensions

### Debugging
- Set `HEADED=true` environment variable to see the browser in action
- Check browser console logs for extension loading errors
- Verify extension path exists and contains required files

## Notes
- The `.addExtensions()` method expects the directory containing the extension, not the manifest.json file
- This approach is more reliable and follows current Selenium best practices
- Your existing test logic should work unchanged
