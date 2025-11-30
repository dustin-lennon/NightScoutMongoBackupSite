// PM2 ecosystem configuration for development
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'nightscout-backup-site',
      script: 'node_modules/.bin/next',
      args: 'dev',
      cwd: path.resolve(__dirname),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: ['app', 'components', 'public'],
      ignore_watch: ['node_modules', '.next', 'logs'],
      max_memory_restart: '500M',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      }
    }
  ]
};

