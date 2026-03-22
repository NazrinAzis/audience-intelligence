import type { Metadata } from "next";
import "./globals.css";
import { LocalStorageMigration } from "@/components/LocalStorageMigration";
import { VersionProvider } from "@/contexts/VersionContext";
import { LayoutInner } from "@/components/LayoutInner";
import { SidebarWrapper } from "@/components/SidebarWrapper";

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
        <VersionProvider>
          <div className="flex min-h-screen">
            <SidebarWrapper />
            <LocalStorageMigration />
            <LayoutInner>{children}</LayoutInner>
          </div>
        </VersionProvider>
      </body>
    </html>
  );
}
