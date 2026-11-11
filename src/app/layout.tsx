import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "./globals.css";
import AppShell from "@/components/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { AppLockGuard } from "@/components/auth/app-lock-guard";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "EntrenoApp — Rendimiento & Salud",
  description: "Registro de entrenamiento y nutrición de alto rendimiento · Diseñada por Daniel Espinosa",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EntrenoApp",
  },
  icons: {
    icon: [
      { url: "/icon.svg?v=6", type: "image/svg+xml" },
      { url: "/icon-192.png?v=6", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=6", sizes: "512x512", type: "image/png" },
      { url: "/brand/logo-mark-512.png?v=6", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=6",
    apple: [
      { url: "/apple-touch-icon.png?v=6", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg?v=6" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=6" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png?v=6" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=6" />
        <link rel="shortcut icon" href="/favicon.ico?v=6" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('entrenoapp_theme');
                  var theme = saved || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          <AppLockGuard>
            <AppShell>{children}</AppShell>
          </AppLockGuard>
        </ToastProvider>
      </body>
    </html>
  );
}
