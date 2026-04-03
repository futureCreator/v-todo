import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "v-todo",
  description: "아이젠하워 매트릭스 기반 Todo",
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
    { media: "(prefers-color-scheme: dark)", color: "#1e1e2e" },
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
