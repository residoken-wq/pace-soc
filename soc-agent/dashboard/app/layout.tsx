import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PACE Sentinel",
  description: "Ubuntu fleet management and security operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
