import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { TopBar } from "../components/top-bar";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "Nightscout Backup Dashboard",
  description: "Internal admin dashboard for managing MongoDB backups to S3"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-background dark:text-slate-50">
        <Providers>
          <TopBar />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}


