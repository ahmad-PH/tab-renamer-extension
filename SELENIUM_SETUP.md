# Selenium Tests Setup with Chrome for Testing

This project uses **Chrome for Testing** with the official `@puppeteer/browsers` package for Selenium tests.

## Prerequisites

Before running Selenium tests, you need to:

1. Fix npm cache permissions (if needed):
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Setup Chrome for Testing

Download Chrome for Testing by running:

```bash
npm run setup:chrome
```

This will download the stable version of Chrome for Testing to the `./chrome-cache/` directory.

**Note:** The `chrome-cache/` directory is gitignored and should not be committed.

## Running Selenium Tests

After setup, run the Selenium tests with:

```bash
npm run test:selenium
```

Or run the tests with headed browser (visible):

```bash
HEADED=1 npm run test:selenium
```

## How It Works

- The `@puppeteer/browsers` package automatically downloads and manages Chrome for Testing
- The test file uses `computeExecutablePath()` to dynamically find the Chrome binary
- No hardcoded paths - works on any machine/OS
- ChromeDriver is automatically matched to the Chrome version

## Specifying Chrome Version

To install a specific Chrome version instead of stable:

```bash
npx @puppeteer/browsers install chrome@120.0.6099.109 --path ./chrome-cache
```

Then update the `getChromePath()` function in `tests/selenium_e2e/seleniumTests.test.js` to use the specific buildId.

## Troubleshooting

### Chrome binary not found
If you get "Chrome binary not found" errors:
1. Make sure you ran `npm run setup:chrome`
2. Check that `chrome-cache/` directory exists in the project root
3. Verify the directory contains Chrome browser files

### npm cache permissions error
If npm commands fail with EPERM errors, run:
```bash
sudo chown -R $(whoami) ~/.npm
```

