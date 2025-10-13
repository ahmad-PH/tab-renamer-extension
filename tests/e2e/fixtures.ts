import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import appRootPath from 'app-root-path';
import os from 'os';
import { randomUUID } from 'crypto';

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

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
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
});
export const expect = test.expect;