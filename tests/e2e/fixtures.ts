import { test as base, chromium, type BrowserContext, type Page, type ConsoleMessage } from '@playwright/test';
import path from 'path';
import appRootPath from 'app-root-path';
import os from 'os';
import { randomUUID } from 'crypto';
import fs from 'fs';

// Detect the actual platform
function getPlatformUserAgent() {
  const platform = os.platform();
  
  // Return user agent strings that match the actual platform
  if (platform === 'darwin') {
    return {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'MacIntel'
    };
  } else if (platform === 'win32') {
    return {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'Win32'
    };
  } else if (platform === 'linux') {
    return {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'Linux x86_64'
    };
  }
  
  // Default to Mac
  return {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    platform: 'MacIntel'
  };
}

// Helper function to set up console logging for a page
function setupConsoleLogging(page: Page, consoleLogs: ConsoleMessage[]) {
  page.on('console', (msg) => {
    consoleLogs.push(msg);
  });
}

// Helper function to print collected console logs
async function printConsoleLogs(consoleLogs: ConsoleMessage[]) {
  if (consoleLogs.length > 0) {
    console.log('\n==================== Browser Console Logs ====================');
    for (const msg of consoleLogs) {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      const prefix = `[${type.toUpperCase()}]`;
      
      // Format location if available
      const locationStr = location.url ? ` (${location.url}:${location.lineNumber})` : '';
      
      console.log(`${prefix}${locationStr} ${text}`);
      
      // If there are args, try to print them as well
      try {
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        if (args.length > 0 && text !== args.join(' ')) {
          console.log('  Args:', args);
        }
      } catch (e) {
        // Some args might not be serializable, ignore
      }
    }
    console.log('==============================================================\n');
  }
}

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  page: Page;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(appRootPath.path, 'dist/dev');
    const { userAgent } = getPlatformUserAgent();
    
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      userAgent,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');

    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
  page: async ({ context }, use, testInfo) => {
    const page = await context.newPage();
    const consoleLogs: ConsoleMessage[] = [];
    
    // Set up console logging
    setupConsoleLogging(page, consoleLogs);
    
    // Use the page
    await use(page);
    
    // Print console logs after test finishes
    await printConsoleLogs(consoleLogs);
    
    await page.close();
  },
});

// Special fixture for persistent context with user data directory
export const testWithPersistentContext = base.extend<{
  context: BrowserContext;
  extensionId: string;
  userDataDir: string;
  restartBrowser: () => Promise<BrowserContext>;
  page: Page;
}>({
  userDataDir: async ({ }, use) => {
    // Create a temporary directory for user data
    const tempDir = path.join(os.tmpdir(), `playwright-chrome-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    await use(tempDir);
    
    // Clean up the temporary directory after test
    // Add a small delay to ensure Chrome has released all file handles
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // If cleanup fails, it's not critical - the OS will clean up temp files eventually
      console.warn(`Failed to clean up temp directory ${tempDir}:`, error);
    }
  },
  
  context: async ({ userDataDir }, use) => {
    const pathToExtension = path.join(appRootPath.path, 'dist/dev');
    const { userAgent } = getPlatformUserAgent();
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      userAgent,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  
  restartBrowser: async ({ userDataDir }, use) => {
    const pathToExtension = path.join(appRootPath.path, 'dist/dev');
    const { userAgent } = getPlatformUserAgent();
    
    const restartFunction = async (): Promise<BrowserContext> => {
      return await chromium.launchPersistentContext(userDataDir, {
        channel: 'chromium',
        userAgent,
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
      });
    };
    
    await use(restartFunction);
  },
  
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');

    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
  
  page: async ({ context }, use, testInfo) => {
    const page = await context.newPage();
    const consoleLogs: ConsoleMessage[] = [];
    
    // Set up console logging
    setupConsoleLogging(page, consoleLogs);
    
    // Use the page
    await use(page);
    
    // Print console logs after test finishes
    await printConsoleLogs(consoleLogs);
    
    await page.close();
  },
});

export const expect = test.expect;