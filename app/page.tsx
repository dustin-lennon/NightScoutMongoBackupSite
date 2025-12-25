"use client";

import PM2Status from "@/components/pm2-status";
import BackupManager from "@/components/backup-manager";

export default function DashboardPage() {
  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <BackupManager />
        <PM2Status />
      </div>
    </main>
  );
}