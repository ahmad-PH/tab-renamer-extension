import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import appRootPath from 'app-root-path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Just ensure the project root directory exists
    const projectRoot = appRootPath.path;
    if (!fs.existsSync(projectRoot)) {
      throw new Error(`Project root directory does not exist: ${projectRoot}`);
    }
  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    throw error; // Fail fast if setup fails
  }
}

export default globalSetup;
