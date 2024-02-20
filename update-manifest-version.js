const fs = require('fs');

// Load package.json and manifest.json and get the version
const packageJson = require('./package.json');
const manifestPath = './manifest.json';
const manifestJson = require(manifestPath);

// Update version in manifest.json
manifestJson.version = packageJson.version;

// Write back to manifest.json
fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 4));