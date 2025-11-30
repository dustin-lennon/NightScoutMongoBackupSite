// PM2 ecosystem configuration for production
// 
// This configuration runs the Next.js production server.
// Make sure to build the app first: bun run build
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'nightscout-backup-site',
      script: './start.sh',
      cwd: path.resolve(__dirname),
      exec_mode: 'fork',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      }
    }
  ]
};
