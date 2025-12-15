#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');

// Get version from package.json
const packageJson = require('./package.json');
console.log(`Starting NightScout Backup Site v${packageJson.version}`);

// Start the Next.js server with bunx
const child = spawn('bunx', ['next', 'start'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env }
});

child.on('exit', (code) => {
  process.exit(code);
});

