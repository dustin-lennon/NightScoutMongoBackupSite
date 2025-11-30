// PM2 ecosystem configuration for production
// 
// This configuration runs the Next.js production server.
// Make sure to build the app first: bun run build
// 
// Environment variables are passed from the deployment script via shell environment.
// When PM2 reloads with --update-env, it will merge shell environment variables
// into the process environment.
// 
// Required variables (must be exported in shell before PM2 start/reload):
// - NEXTAUTH_SECRET
// - DISCORD_CLIENT_ID
// - DISCORD_CLIENT_SECRET
// - ALLOWED_DISCORD_USER_ID
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'nightscout-backup-site',
      script: 'bunx',
      args: ['next', 'start'],
      cwd: path.resolve(__dirname),
      exec_mode: 'fork',
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
        // These will be merged from shell environment when using --update-env
        // Do not set defaults here - they must be provided by the deployment script
      }
    }
  ]
};
