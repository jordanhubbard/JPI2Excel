// Revision: 1. Local fonts keep the workspace independent of font services.
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "JPI2Excel | Flight workspace",
  description: "Explore JPI engine data and export Excel in your browser.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
