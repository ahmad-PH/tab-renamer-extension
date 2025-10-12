import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import appRootPath from 'app-root-path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test data...');
  
  const testUserDataDir = path.join(appRootPath.path, 'test-user-data');
  
  try {
    if (fs.existsSync(testUserDataDir)) {
      fs.rmSync(testUserDataDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('❌ Error cleaning up test user data directory:', error);
    // Don't throw the error to avoid failing the test suite
    // The cleanup is important but shouldn't break the test results
  }
}

export default globalTeardown;
