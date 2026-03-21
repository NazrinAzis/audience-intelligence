import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { LocalStorageMigration } from "@/components/LocalStorageMigration";

export const metadata: Metadata = {
  title: "Audience Intelligence — Naz",
  description: "Naz Audience Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased bg-nz-bg text-nz-text">
        <div className="flex min-h-screen">
          <Sidebar />
          <LocalStorageMigration />
          <main className="flex-1 ml-[200px] min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}
