# NightScoutMongoBackupSite

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Stelth2000-Inc_NightScoutMongoBackupSite&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Stelth2000-Inc_NightScoutMongoBackupSite) [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Stelth2000-Inc_NightScoutMongoBackupSite&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=Stelth2000-Inc_NightScoutMongoBackupSite) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Stelth2000-Inc_NightScoutMongoBackupSite&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Stelth2000-Inc_NightScoutMongoBackupSite) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Stelth2000-Inc_NightScoutMongoBackupSite&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Stelth2000-Inc_NightScoutMongoBackupSite) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Stelth2000-Inc_NightScoutMongoBackupSite&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Stelth2000-Inc_NightScoutMongoBackupSite)

A Next.js web application that provides an internal admin dashboard for managing NightScout MongoDB backups stored in AWS S3. The dashboard allows administrators to create, list, download, and delete compressed backup files, as well as monitor the status of the associated Discord bot processes via PM2.

## Features

- **Backup Management**: Create, list, download, and delete MongoDB backups stored in S3
- **PM2 Status Monitoring**: Real-time monitoring of Discord bot process status, uptime, memory usage, and CPU utilization
- **Authentication**: Secure access via NextAuth with session management
- **Modern UI**: Responsive design with dark theme support
- **Real-time Updates**: Automatic refresh of backup lists and PM2 status

