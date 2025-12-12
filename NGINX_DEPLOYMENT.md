# Nginx Configuration for Combined Python API + Next.js Site

This guide explains how to deploy both the Python backup API and the Next.js site on the same domain using nginx.

## Architecture

- **Python API** (port 8000): Handles `/backup`, `/health`, `/test-connections`
- **Next.js Site** (port 3000): Handles all other routes including `/api/*` endpoints

## Deployment Steps

### 1. Update Nginx Configuration

1. Copy the new configuration file to your server:
   ```bash
   sudo cp nginx-combined.conf /etc/nginx/sites-available/nightscout-backup
   ```

2. Test the configuration:
   ```bash
   sudo nginx -t
   ```

3. If the test passes, reload nginx:
   ```bash
   sudo systemctl reload nginx
   ```

### 2. Start Both Services

Make sure both services are running:

**Python API** (port 8000):
```bash
cd /path/to/NightScoutMongoBackup
pm2 start ecosystem.prod.config.js --only nightscout-backup-api
# OR if API runs in bot process:
pm2 start ecosystem.prod.config.js --only nightscout-backup-bot
```

**Next.js Site** (port 3000):
```bash
cd /path/to/NightScoutMongoBackupSite
npm run build  # Build the Next.js app first
pm2 start ecosystem.prod.config.js
```

Verify both are running:
```bash
pm2 status
```

### 3. Environment Variables

For the **Next.js site**, you have two options:

**Option A: Use relative URLs (recommended for same-domain setup)**
- Don't set `PYTHON_BACKUP_API_URL` (or set it to empty string)
- The Next.js API routes will use relative URLs like `/backup` which will be routed through nginx

**Option B: Use full domain URL**
- Set `PYTHON_BACKUP_API_URL=https://nightscout-backup.stelth2000inc.com`
- This will make requests go through nginx as well

### 4. Verify Routing

Test the endpoints:

```bash
# Python API health check (should route to port 8000)
curl https://nightscout-backup.stelth2000inc.com/health

# Next.js site (should route to port 3000)
curl https://nightscout-backup.stelth2000inc.com/

# Next.js API route (should route to port 3000)
curl https://nightscout-backup.stelth2000inc.com/api/backups/list
```

## Routing Logic

The nginx configuration routes requests as follows:

1. **Python API endpoints** (`/backup`, `/health`, `/test-connections`) → `http://127.0.0.1:8000`
2. **Everything else** (Next.js pages, `/api/*` routes) → `http://127.0.0.1:3000`

## Troubleshooting

### 502 Bad Gateway

Check that both services are running:
```bash
pm2 status
pm2 logs nightscout-backup-api
pm2 logs nightscout-backup-site
```

Test direct connections:
```bash
curl http://localhost:8000/health  # Python API
curl http://localhost:3000/        # Next.js site
```

### CORS Errors

If you see CORS errors, ensure the Python API's `BACKUP_API_CORS_ORIGINS` includes your domain:
```bash
BACKUP_API_CORS_ORIGINS=https://nightscout-backup.stelth2000inc.com
```

Then restart the Python API:
```bash
pm2 restart nightscout-backup-api
```

### Check Nginx Logs

```bash
sudo tail -f /home/demonicpagan/NightScoutMongoBackup/logs/nginx_nightscout-backup_error.log
sudo tail -f /home/demonicpagan/NightScoutMongoBackup/logs/nginx_nightscout-backup_access.log
```

## Security Notes

- Both services should only listen on `127.0.0.1` (localhost) or `0.0.0.0` but be protected by firewall
- Only ports 80 and 443 should be exposed to the internet
- SSL certificates are managed by Certbot
- Consider adding rate limiting for the `/backup` endpoint in production

