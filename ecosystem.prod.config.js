// PM2 ecosystem configuration for production
// 
// This configuration runs the Next.js production server.
// Make sure to build the app first: bun run build
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
        // Environment variables are passed from GitHub secrets via deployment script
        // PM2 will inherit these from the shell environment when started:
        // - NEXTAUTH_SECRET
        // - DISCORD_CLIENT_ID
        // - DISCORD_CLIENT_SECRET
        // - ALLOWED_DISCORD_USER_ID
        // - DOTENV_KEY (optional, for dotenv-vault support)
      }
    }
  ]
};
