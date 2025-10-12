import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import appRootPath from 'app-root-path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up test environment...');
  
  const testUserDataDir = path.join(appRootPath.path, 'test-user-data');
  
  try {
    if (fs.existsSync(testUserDataDir)) {
      fs.rmSync(testUserDataDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    throw error; // Fail fast if setup fails
  }
}

export default globalSetup;
