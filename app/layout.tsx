import type { Metadata } from "next";
import "./globals.css";
import "./travel.css";

export const metadata: Metadata = {
  title: "Our World",
  description: "Two personal travel maps and one shared journey.",
  appleWebApp: {
    capable: true,
    title: "Our World",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/app-icon.png",
    shortcut: "/app-icon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
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
