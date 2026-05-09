import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "v-todo",
  description: "할 일, 일정, 노트, 습관까지 한곳에서 관리하는 데일리 플래너",
  applicationName: "v-todo",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "v-todo",
  },
  icons: {
    icon: `${basePath}/favicon.ico`,
    apple: `${basePath}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
